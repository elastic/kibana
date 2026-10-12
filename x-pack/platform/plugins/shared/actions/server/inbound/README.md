# Inbound connector events (tech preview)

Public HTTP ingress for connector-scoped events. Default **off**. Requires a Gold (or trial) license. The first spoke is `.inboundWebhook` → `inboundWebhook.received`.

## Enable

```yaml
# kibana.yml / kibana.dev.yml
xpack.actions.inboundEvents.enabled: true
```

Restart Kibana. With the flag off, `.inboundWebhook` is not registered (create / `listTypes` omit it) and the hub route is not mounted.

## Create, then mint the token

Public create/update never return a plaintext token (and never mint one). The HMAC of the token is stored on a hidden `connector_ingress_credential` saved object. Public GET/create/update/list never return the hash. After create, call rotate once to mint the first live token.

The token shape is `{credentialId}.{secret}`. One live credential saved object per connector (random id). Rotate deletes the previous SO and creates a new one; the hub `get`s the id from the token and verifies the HMAC. Renaming the connector does not remint the ingest token.

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

A nested `payload.challenge` is emitted, not acked. A bad or rotated-away token returns **404** (fail-closed; same as unknown connector). Once that connector's failed-auth budget is spent, further requests are also **404** and skip the saved-object read. Over the connector rate limit or the in-flight cap, the hub returns **429** with `Retry-After` and `RateLimit: "inbound-events";r=0;t=<seconds>`. The body is “Too many requests. Try again later.”

## Rate limit

Per Kibana process. On when the hub is enabled. `rateLimit.enabled: false` turns the windows off and leaves admission on.

```yaml
xpack.actions.inboundEvents.rateLimit:
  enabled: true
  remoteAddress:
    limit: 10 # failed auths only, per minute
    window: 1m
  connector:
    limit: 300 # authenticated requests, per minute
    window: 1m
```

A rejected token spends the address budget for that socket and that connector (space, type, and connector id). A missing connector does not. A request that authenticates does not. Once the budget is spent the response stays **404**, so it does not show that the connector exists. The socket is `request.socket.remoteAddress`, or `unknown` when the socket has none. The hub does not read `X-Forwarded-For`. On Cloud the socket is often the shared proxy, so each connector has its own 10.

The connector budget counts one authenticated request, including a handshake that passes auth. A request that emits 25 events still costs 1. Each node keeps its own counters.

## Admission

Per Kibana process, taken before the body is read. On when the hub is enabled. `admission.enabled: false` turns the cap off and leaves the windows on.

```yaml
xpack.actions.inboundEvents.admission:
  enabled: true
  maxInFlight: 50 # this process
  maxInFlightPerConnector: 10
```

At most 50 inbound requests are in flight at once, and 10 of those may be for one connector. A full cap returns **429** with `Retry-After: 1`. The body is not read. The slot is held until the response is sent or the client disconnects. `maxInFlight` times `maxBodyBytes` is the raw-body budget for this route (50mb at the defaults).

## Bursts

A burst that stays inside the in-flight cap and the connector window is accepted and scheduled on the same path as a single request. The defaults are 10 in flight for one connector, 50 in flight on this process, and 300 authenticated requests per minute per connector. Past either cap the sender gets **429** and retries after `Retry-After`.

When the last-saver identity is missing, the sender still gets **202** `{ "ok": true }`. Nothing is scheduled. Kibana logs `identity_missing` and counts `result=schedule`.

When one or more events in an accepted body fail to emit, the sender still gets **202**. Kibana logs `emit_partial` and counts `result=schedule`. Events earlier in that same body may already have been scheduled.

## Operator visibility

Every hub response writes one `Inbound events outcome=...` log line and increments `kibana.actions.inbound_events.request.count` once. The attribute is `result`. It has six values, so the series omits the connector id. The log and the counter omit the token and the raw body.

| What the sender received | Log `outcome` | Metric `result` |
| --- | --- | --- |
| 202, events scheduled (or an empty emit) | `accepted` | `accepted` |
| 200 handshake | `http_ack` | `accepted` |
| 404 bad or unknown token | `auth_fail` | `auth` |
| 413 body larger than `maxBodyBytes` (default 1mb) | `payload_too_large` | `size` |
| 429 over the window or the in-flight cap | `rate_limited` | `throttle` |
| 202, nothing scheduled | `identity_missing` | `schedule` |
| 202, one or more events in the body failed to emit | `emit_partial` | `schedule` |
| Other reject | `disabled`, `no_spec`, `load_miss`, `validate_fail`, `handle_fail` | `other` |

`auth_fail` and an address or in-flight `rate_limited` line are debug. A connector `rate_limited` line and `payload_too_large` are info. `emit_partial` and `identity_missing` are warn. A 413 comes from the route body limit before the handler runs, so it does not spend the per-minute window. The pre-response hook records it.

## Who a matching workflow runs as

The ingest token only authenticates the POST. After it is accepted, Actions decrypts the connector and emits with a fake request built from the last-saver Kibana API key on the `action` saved object. Matching workflows therefore run **as the last person who saved that inbound connector**, not as `kibana_system` and not as the workflow YAML author. Anyone who holds the ingest token can trigger work with that user's privileges.

- Last save wins: inbound create/update remints the framework key and invalidates the previous one.
- Rotate ingest token does **not** remint that identity.
- Missing or undecryptable identity still returns **202** and does **not** emit.

## Rotate (first mint and later rotations)

Mints a new `connector_ingress_credential`, deletes the previous credential saved object (if any), and returns `{ "ingest_token": "<token>" }` once. Rotate is audited as a credential event, not a connector update. This is an internal UI route (`access: internal`); include `x-elastic-internal-origin` when calling it from curl. The Stack Management flyout rotates once after create to show the first token.

```bash
curl -u elastic:changeme -X POST \
  "$KIBANA_URL/internal/actions/connector/$CONNECTOR_ID/_rotate_event_token" \
  -H 'kbn-xsrf: true' \
  -H 'x-elastic-internal-origin: kibana'
```

POST the hub with the old token → 404. Use the new token from the rotate response. Rotate does not remint the last-saver identity.
