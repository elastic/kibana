# streams-kbn branch — graph-stream PoC status

**Branch:** `streams-kbn`  
**As of:** 2026-06-02  
**Owners:** Andrew Cholakian, João Duarte

---

## What this branch is

A prototype proving that Elasticsearch + Kibana today can express a **non-hierarchical, graph-based stream topology** using ES ingest pipelines and `reroute` processors — without requiring a managed processing service. This feeds the open RFC on execution-layer architecture.

The new `type: 'graph'` stream type lives **parallel to** the existing `wired`/`classic`/`query` types. Wired streams (`logs.*`) are completely untouched.

---

## PoC exit gate: CLOSED ✅

All three PoC checks passed empirically on ES 9.5 + Kibana:

| Check | Result |
|---|---|
| **PoC-1** — ES `reroute` is hierarchy-agnostic; non-child destination accepted without rejection | ✅ confirmed |
| **PoC-2** — Multi-root / arbitrary node names work end-to-end (no `logs.*` root required) | ✅ confirmed |
| **PoC-3** — Streamlang → ingest-pipeline transpilation works on the guard-less graph path | ✅ confirmed |
| No parent-name guard rejection | ✅ confirmed (guard not generated on graph path) |
| Intermediate retention (non-matching doc stays in its node's data stream) | ✅ confirmed |
| `field_access_pattern: flexible` — no schema-enforcement failures | ✅ confirmed |
| Failure store — zero failure events | ✅ confirmed |

**Headline finding:** ES `reroute` is already hierarchy-agnostic — it accepts any destination name, with no knowledge of stream hierarchy. The hierarchy coupling was entirely Kibana-side (validation gates + parent-name guard), not ES-side. The graph path removes those gates and omits the guard entirely.

---

## What was built

### New stream type: `type: 'graph'`
- Schema in `@kbn/streams-schema` — `src/models/ingest/graph.ts`
- `GraphStream` active record — `state_management/streams/graph_stream.ts`
  - No ancestor cascade on upsert — nodes are standalone
  - No `isChildOf`, `hasSupportedStreamsRoot`, or bidirectional routing-completeness checks
  - DAG cycle check + soft depth guardrail (default: 10 hops)
  - Validation: lowercase node names only, no dots
- Pipeline generation: guard-less (no `stream.name == parentName` check), stamps `stream.name`, calls `@stream.reroutes`
- `composed_of` generates a standalone component-template chain (own `@stream.layer` only — no `getAncestorsAndSelf` walk)
- Fix to `generate_layer.ts`: skips OTel `baseMappings` + root sort settings for graph nodes (single-segment names like `nginx_es` would otherwise trigger root treatment via `isRoot()`, causing ES 9.5 to reject the component template with a field alias validation error on non-existent `severity_text`)

### DSL loader + API routes
- `graph_dsl_loader.ts` — converts the graph DSL to N per-node `GraphStream.UpsertRequest` objects
- `routes/streams/graph/route.ts` — two endpoints:
  - `POST /internal/streams/_graph` — loads a topology
  - `DELETE /internal/streams/_graph/{topology}` — deletes all nodes

### Test script
- `scripts/graph_poc_e2e.sh` — full end-to-end: cleanup → load → verify pipelines → simulate each hop → real ingest → check landing

---

## How to use it

### Prerequisites
- Kibana running locally (`yarn start`)
- ES 9.5+ running (graph nodes need `field_access_pattern: flexible` support)
- `scripts/kibana_api_common.sh` auto-detects `elastic:changeme` at `localhost:5601`

### Load a topology
```bash
curl -s -u elastic:changeme \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" \
  -X POST http://localhost:5601/internal/streams/_graph \
  -d @- <<'EOF'
{
  "name": "my-topology",
  "sources": { "my_source": { "type": "otlp" } },
  "pipelines": { "my_parse": { "steps": [ ... ] } },
  "destinations": { "my_dest": { "type": "elasticsearch" } },
  "routing": [
    { "from": "my_source", "to": "my_parse", "where": { "field": "service.name", "eq": "myapp" } },
    { "from": "my_parse", "to": "my_dest" }
  ]
}
EOF
```

### Run the full e2e test
```bash
bash scripts/graph_poc_e2e.sh
```

### DSL constraints (current prototype)
- Node names: **lowercase, no dots** (e.g. `nginx_parse`, `payment_logs_es`)
- Routing: global edge list — each edge has `from`, `to`, and optional `where` (Streamlang condition)
- An edge without `where` routes unconditionally (always-condition)
- `type: 'graph'` nodes are provisioned via the DSL endpoint, not via `PUT /api/streams/{name}` directly (though the API works too)
- No `clone` fan-out — the ES execution layer is `exclusive` (first-match) only

---

## Real-world scenario examples

All examples use the current v0.1 DSL format (global `routing` edge list). The v0.2 node-output model
(`streams_graph_dsl.md`) is the planned authoring surface; the lowering to per-node definitions is the
same.

---

### Scenario 1 — Kubernetes application logs

Logs from multiple Kubernetes namespaces arrive in a single OTLP stream. Route system-namespace logs
to a compliance index, application logs to per-team indices, and discard (retain) anything else in the
intake stream.

```json
{
  "name": "k8s-logs-topology",
  "sources": {
    "k8s_otlp_in": { "type": "otlp" }
  },
  "pipelines": {
    "k8s_enrich": {
      "steps": [
        {
          "action": "grok",
          "from": "body.message",
          "patterns": ["%{TIMESTAMP_ISO8601:attributes.ts} %{LOGLEVEL:attributes.level} %{GREEDYDATA:attributes.msg}"]
        },
        {
          "action": "set",
          "field": "attributes.k8s.cluster",
          "value": "prod-us-east-1"
        }
      ]
    }
  },
  "destinations": {
    "k8s_system_logs":  { "type": "elasticsearch" },
    "k8s_platform_logs": { "type": "elasticsearch" },
    "k8s_app_logs":     { "type": "elasticsearch" }
  },
  "routing": [
    {
      "from": "k8s_otlp_in",
      "to": "k8s_enrich",
      "where": { "field": "resource.attributes.k8s.namespace.name", "exists": true }
    },
    {
      "from": "k8s_enrich",
      "to": "k8s_system_logs",
      "where": { "field": "resource.attributes.k8s.namespace.name", "eq": "kube-system" }
    },
    {
      "from": "k8s_enrich",
      "to": "k8s_platform_logs",
      "where": {
        "or": [
          { "field": "resource.attributes.k8s.namespace.name", "eq": "monitoring" },
          { "field": "resource.attributes.k8s.namespace.name", "eq": "ingress-nginx" }
        ]
      }
    },
    {
      "from": "k8s_enrich",
      "to": "k8s_app_logs"
    }
  ]
}
```

**Routing path:** `k8s_otlp_in → k8s_enrich → k8s_system_logs | k8s_platform_logs | k8s_app_logs`

Non-Kubernetes docs (no `k8s.namespace.name`) match no edge from `k8s_otlp_in` and are retained there
(intermediate retention).

---

### Scenario 2 — E-commerce payment processing

An order-processing service emits a mix of payment events, fulfillment events, and general app logs.
Payment events must land in a PCI-scoped index; fulfillment events route to the warehouse team's index;
everything else goes to general app logs. Parse structured JSON bodies and extract key fields first.

```json
{
  "name": "ecommerce-topology",
  "sources": {
    "orders_otlp_in": { "type": "otlp" }
  },
  "pipelines": {
    "orders_parse": {
      "steps": [
        {
          "action": "json_extract",
          "from": "body.message",
          "to": "attributes.payload"
        },
        {
          "action": "set",
          "field": "attributes.env",
          "value": "production"
        }
      ]
    },
    "payment_enrich": {
      "steps": [
        {
          "action": "redact",
          "field": "attributes.payload.card_number",
          "patterns": ["\\d{4}-\\d{4}-\\d{4}-\\d{4}"]
        },
        {
          "action": "set",
          "field": "attributes.pci_scope",
          "value": "true"
        }
      ]
    }
  },
  "destinations": {
    "payment_pci_logs":      { "type": "elasticsearch", "lifecycle": { "dsl": { "data_retention": "365d" } } },
    "fulfillment_logs":      { "type": "elasticsearch" },
    "orders_app_logs":       { "type": "elasticsearch" }
  },
  "routing": [
    {
      "from": "orders_otlp_in",
      "to": "orders_parse",
      "where": { "field": "resource.attributes.service.name", "eq": "orders-service" }
    },
    {
      "from": "orders_parse",
      "to": "payment_enrich",
      "where": { "field": "attributes.event_type", "eq": "payment" }
    },
    {
      "from": "orders_parse",
      "to": "fulfillment_logs",
      "where": { "field": "attributes.event_type", "eq": "fulfillment" }
    },
    {
      "from": "orders_parse",
      "to": "orders_app_logs"
    },
    {
      "from": "payment_enrich",
      "to": "payment_pci_logs"
    }
  ]
}
```

**Routing paths:**
- `orders_otlp_in → orders_parse → payment_enrich → payment_pci_logs` (payment events, PCI-redacted, 365d retention)
- `orders_otlp_in → orders_parse → fulfillment_logs` (fulfillment events)
- `orders_otlp_in → orders_parse → orders_app_logs` (everything else from orders-service)
- Non-`orders-service` docs retained in `orders_otlp_in` (intermediate retention)

This demonstrates a **two-hop pipeline** (`orders_parse → payment_enrich`) that was impossible with wired
streams (non-child reroute + no parent-guard rejection — the key PoC-1 finding).

---

### Scenario 3 — Multi-vendor firewall / security telemetry

A SOC ingests syslog from three firewall vendors. Each vendor has a different log format requiring
distinct grok patterns. After parsing, all events funnel into vendor-specific indices; high-severity
events (regardless of vendor) also land in a shared SIEM alert index via a second routing hop.

```json
{
  "name": "firewall-topology",
  "sources": {
    "firewall_syslog_in": { "type": "async_bulk" }
  },
  "pipelines": {
    "paloalto_parse": {
      "steps": [
        {
          "action": "grok",
          "from": "body.message",
          "patterns": ["%{SYSLOGTIMESTAMP:attributes.ts},%{WORD:attributes.vendor},%{WORD:attributes.log_type},%{WORD:attributes.threat},%{IP:attributes.src_ip},%{IP:attributes.dst_ip}"]
        },
        { "action": "set", "field": "attributes.vendor_name", "value": "paloalto" }
      ]
    },
    "checkpoint_parse": {
      "steps": [
        {
          "action": "dissect",
          "from": "body.message",
          "pattern": "%{attributes.ts} %{attributes.hostname} %{attributes.action} src=%{attributes.src_ip} dst=%{attributes.dst_ip} severity=%{attributes.severity}"
        },
        { "action": "set", "field": "attributes.vendor_name", "value": "checkpoint" }
      ]
    },
    "fortinet_parse": {
      "steps": [
        {
          "action": "dissect",
          "from": "body.message",
          "pattern": "date=%{attributes.date} time=%{attributes.time} devname=%{attributes.devname} level=%{attributes.severity} action=%{attributes.action} srcip=%{attributes.src_ip} dstip=%{attributes.dst_ip}"
        },
        { "action": "set", "field": "attributes.vendor_name", "value": "fortinet" }
      ]
    }
  },
  "destinations": {
    "paloalto_firewall_logs":  { "type": "elasticsearch" },
    "checkpoint_firewall_logs": { "type": "elasticsearch" },
    "fortinet_firewall_logs":   { "type": "elasticsearch" },
    "siem_high_severity_alerts": {
      "type": "elasticsearch",
      "lifecycle": { "dsl": { "data_retention": "2y" } }
    }
  },
  "routing": [
    {
      "from": "firewall_syslog_in",
      "to": "paloalto_parse",
      "where": { "field": "resource.attributes.vendor", "eq": "paloalto" }
    },
    {
      "from": "firewall_syslog_in",
      "to": "checkpoint_parse",
      "where": { "field": "resource.attributes.vendor", "eq": "checkpoint" }
    },
    {
      "from": "firewall_syslog_in",
      "to": "fortinet_parse",
      "where": { "field": "resource.attributes.vendor", "eq": "fortinet" }
    },
    {
      "from": "paloalto_parse",
      "to": "siem_high_severity_alerts",
      "where": { "field": "attributes.threat", "eq": "critical" }
    },
    {
      "from": "paloalto_parse",
      "to": "paloalto_firewall_logs"
    },
    {
      "from": "checkpoint_parse",
      "to": "siem_high_severity_alerts",
      "where": { "field": "attributes.severity", "eq": "critical" }
    },
    {
      "from": "checkpoint_parse",
      "to": "checkpoint_firewall_logs"
    },
    {
      "from": "fortinet_parse",
      "to": "siem_high_severity_alerts",
      "where": { "field": "attributes.severity", "eq": "critical" }
    },
    {
      "from": "fortinet_parse",
      "to": "fortinet_firewall_logs"
    }
  ]
}
```

**Routing paths (exclusive — first-match-wins within each node):**
- `firewall_syslog_in → paloalto_parse → siem_high_severity_alerts` (critical palo alto events)
- `firewall_syslog_in → paloalto_parse → paloalto_firewall_logs` (all other palo alto)
- `firewall_syslog_in → checkpoint_parse → siem_high_severity_alerts` (critical checkpoint)
- `firewall_syslog_in → checkpoint_parse → checkpoint_firewall_logs`
- `firewall_syslog_in → fortinet_parse → siem_high_severity_alerts` (critical fortinet)
- `firewall_syslog_in → fortinet_parse → fortinet_firewall_logs`
- Unknown-vendor docs retained in `firewall_syslog_in`

Note: because this is `exclusive` routing, a critical palo alto event lands **only** in `siem_high_severity_alerts`, not also in `paloalto_firewall_logs`. `clone` fan-out (landing in both) is a model-level capability deferred to the managed processing service.

---

## Known limitations / out of scope for this PoC

| Limitation | Notes |
|---|---|
| `clone` fan-out | ES ingest indexes a doc once; fan-out requires the managed service. The model supports it, the ES path does not. |
| Mid-graph injection protection | No parent-name guard is emitted — docs can be written directly to any node's data stream, bypassing upstream processing. Accepted at this stage. |
| No field/settings inheritance | Each node is configured explicitly. This is deliberate (no name-based ancestry). |
| DSL format is v0.1 | The route + DSL loader use the global edge list (`routing: [{from, to, where}]`). The v0.2 node-output model (`streams_graph_dsl.md`) is the target authoring surface for Workstream B. |
| `grok` field access | Test topology's grok used `body.message` (flat dotted key) — the field may need to be addressed as a nested OTel object. Not a routing blocker. |
| `stream.name` on real-ingest docs | The stamp reflects the **last pipeline in the chain** to run (e.g. `nginx_es` not `service_a_parse`), because the rerouted doc re-enters ES at the destination and triggers that node's own processing pipeline. |

---

## Next steps (Phase 1)

The PoC-1/2/3 exit gate is met. Per `streams_execution_layer_plan.md`:

1. **RFC decision checkpoint** — reconvene with PoC finding: "ES `reroute` can express graph topology at acceptable cost; parallel graph-stream type approach is viable." João Duarte + Andrew Cholakian.
2. **Workstream A** — productionize the parallel graph-stream type (behind a feature flag; add proper API surface, validation, UI wiring).
3. **Workstream B** — upgrade the DSL to the v0.2 node-output model (`streams_graph_dsl.md`), shared UI canvas, YAML/GitOps authoring surface.
4. **Workstream C** — cloud-first ADR reconciliation, metering, input-protocol decisions.

Related docs in this repo:
- [`streams_execution_layer_plan.md`](streams_execution_layer_plan.md) — full plan + decision record
- [`streams_graph_dsl.md`](streams_graph_dsl.md) — v0.2 node-output DSL strawman (target authoring model)
- [`scripts/graph_poc_e2e.sh`](scripts/graph_poc_e2e.sh) — end-to-end PoC test script
