# Connector events bridge

Phase 1 disposable bridge that registers on the Actions inbound events hub and forwards connector events to Workflows via `workflowsExtensions.getClient(request).emitEvent(...)`.

## Why this plugin exists

Keeps Actions free of a hard Workflows dependency. The hub (`actions/server/inbound`) stays consumer-agnostic; this plugin is the single Phase 1 emitter. Actions rejects a second `registerConnectorEventEmitter` call (exactly one emitter).

Registration is gated by `xpack.actions.inboundEvents.enabled`.

## Identity

External ingress has no useful caller principal (public route; ingest token ≠ Kibana auth). This bridge builds a **momentary space-scoped fake request** so `getClient` / `emitEvent` can attribute space only. **Execution identity** (workflow owner / author) is acquired inside Workflows not from the inbound caller.

Emitter failures **rethrow** so the hub records `emit_threw` / `emit_partial` while the public POST still returns **202** (not 5xx).

## Phase 2 replacement

Replace this bridge with the shared event bus **without changing** the SaaS-facing hub URL (`POST /api/actions/events/{connector_type_id}/{connector_id}`). Internal bus producers may pass a real `KibanaRequest`.
