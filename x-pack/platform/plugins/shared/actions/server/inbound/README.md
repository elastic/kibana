# Inbound connector events (tech preview)

Public HTTP ingress for connector-scoped events. Default **off**. Requires a Gold (or trial) license. The first spoke is `.inboundWebhook` → `inboundWebhook.received`.

## Enable

```yaml
# kibana.yml / kibana.dev.yml
xpack.actions.inboundEvents.enabled: true
```

Restart Kibana. With the flag off, `.inboundWebhook` is not registered (create / `listTypes` omit it) and the hub route is not mounted.

## Create, then mint the token

Public create/update never return a plaintext token (and never mint one). Public GET/create/update omit `config.ingestTokenHash`; the hub still verifies against the stored hash. After create, call rotate once to mint the first live token.

```bash
curl -u elastic:changeme -X POST "$KIBANA_URL/api/actions/connector" \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{"name":"sales-ingress","connector_type_id":".inboundWebhook","secrets":{"authType":"none"}}'
```

Spec connectors require `secrets.authType`. For inbound webhook that is `"none"` (no outbound credentials).

Webhook URL is not persisted. Compose it (or copy it from the connector flyout when the UI is available):

```
{publicBaseUrl}/api/actions/events/.inboundWebhook/{connectorId}
```

Use `{publicBaseUrl}/s/{spaceId}/api/actions/events/.inboundWebhook/{connectorId}` when the space is not `default`. `server.publicBaseUrl` should include the Kibana server base path.

Store the token from rotate with the URL. You cannot retrieve the token again without rotating.

## POST the hub

Prefer `Authorization: Bearer`. The `token` query parameter is used only when the Authorization header is absent (a present non-Bearer `Authorization` does not fall back to query).

```bash
# Bearer (preferred)
curl -X POST "$KIBANA_URL/api/actions/events/.inboundWebhook/$CONNECTOR_ID" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{"eventType":"order.created","orderId":"1"}'

# Query token (only if Authorization is omitted)
curl -X POST "$KIBANA_URL/api/actions/events/.inboundWebhook/$CONNECTOR_ID?token=$INGEST_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{"eventType":"order.created","orderId":"1"}'
```

Accepted ingest that **emits** returns **202** `{ "ok": true }`. `.inboundWebhook` **acks** (HTTP **200**, no emitters) when the JSON body has a top-level string `challenge`. Sibling keys are ignored; the response is `{ "challenge": "..." }` only.

```bash
curl -X POST "$KIBANA_URL/api/actions/events/.inboundWebhook/$CONNECTOR_ID" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H 'elastic-api-version: 2023-10-31' \
  -d '{"type":"ping","challenge":"abc"}'
# → 200 {"challenge":"abc"}
```

A nested `payload.challenge` is emitted, not acked. A bad or rotated-away token returns **404** (fail-closed; same as unknown connector).

## Rotate (first mint and later rotations)

Mints a new token, invalidates the previous one immediately (if any), and returns `{ "ingest_token": "<token>" }` once. This is an internal UI route (`access: internal`); include `x-elastic-internal-origin` when calling it from curl. The Stack Management flyout rotates once after create to show the first token.

```bash
curl -u elastic:changeme -X POST \
  "$KIBANA_URL/internal/actions/connector/$CONNECTOR_ID/_rotate_event_token" \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana'
```

POST the hub with the old token → 404. Use the new token from the rotate response.
