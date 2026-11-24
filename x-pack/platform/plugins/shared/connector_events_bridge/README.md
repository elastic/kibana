# Connector events bridge

Registers on the Actions inbound events hub and forwards connector events to Workflows via `workflowsExtensions.getClient(request).emitEvent(...)`. This plugin disappears once Workflows can attach an identity to a workflow.

## Why this plugin exists

Keeps Actions free of a hard Workflows dependency. The hub (`actions/server/inbound`) stays consumer-agnostic; this plugin is the Workflows emitter. Actions rejects a second `registerConnectorEventEmitter` call (exactly one emitter).

Registration is gated by `xpack.actions.inboundEvents.enabled`.

## Identity

External ingress has no useful caller principal (public route; ingest token ≠ Kibana auth). This bridge builds a **momentary space-scoped fake request** so `getClient` / `emitEvent` can attribute space only. **Execution identity** (workflow owner / author) is acquired inside Workflows not from the inbound caller.

Emitter failures **rethrow** so the hub records `emit_threw` / `emit_partial` while the public POST still returns **202** (not 5xx).

## Event bus

The hub also publishes each accepted event on Kibana's event bus, one topic per event id, beside this bridge. A workflow definition has no identity attached to it, and a bus event does not carry one, so Workflows cannot start from the bus yet. This plugin fills that gap: it still calls `emitEvent`, and it still resumes `slack2.hitl_action`. It disappears once Workflows can attach an identity to a workflow. The public ingest URL is unchanged (`POST /api/actions/events/{connector_type_id}/{connector_id}`).
