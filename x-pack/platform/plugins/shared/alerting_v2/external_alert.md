# External Alerts — Architectural Planning

## Overview

<!-- High-level description of external alerts and how they fit into alerting_v2 -->

## Goals

- <!-- Goal 1 -->
- <!-- Goal 2 -->
- <!-- Goal 3 -->

## Non-Goals

- <!-- Non-goal 1 -->

## Background & Motivation

<!-- Why external alerts are needed, context on existing alerting architecture -->

## Terminology

| Term | Definition |
|------|-----------|
| External Alert | <!-- definition --> |

## Proposed Architecture

### Ingestion

External alerts are ingested into the system via **connectors** — one connector type per 3rd party alerting system. Connectors are the integration point between Kibana and external alerting providers, and each connector instance encapsulates the authentication credentials and configuration needed to communicate with a specific external system.

#### Why Connectors?

- **Authentication management** — Connectors provide a secure, user-managed way to store and rotate credentials (API keys, OAuth tokens, etc.) for each 3rd party system.
- **Reusability** — A single connector instance can be shared across multiple rules or workflows that need to pull alerts from the same external source.
- **Existing infrastructure** — The Kibana actions/connectors framework already handles encrypted secret storage, space-scoped access control, and a consistent UI for configuration.

#### Connector-per-Provider Model

Each supported 3rd party alerting system will have its own connector type, for example:

| Connector Type | External System | Auth Method |
|---------------|----------------|-------------|
| <!-- TBD -->  | <!-- TBD -->   | <!-- TBD --> |

Each connector type will define:

1. **Configuration schema** — provider-specific settings (e.g. base URL, polling interval)
2. **Secrets schema** — credentials required to authenticate (e.g. API key, client secret)
3. **Fetch actions** — one or more actions that retrieve alerts from the external system (e.g. fetch open alerts, fetch by severity, fetch by time range)
4. **`installWebhook` action** — registers a webhook on the external system that pushes alerts to Kibana's `alert_events` API (enabling push-based ingestion)
5. **`uninstallWebhook` action** — deregisters a previously installed webhook from the external system (used during cleanup or reconfiguration)
6. **`checkWebhook` action** — verifies that a previously installed webhook still exists and is correctly configured on the external system (used for periodic health checks)
7. **Sync actions** — one or more actions that mutate alert state on the external system to enable bidirectional sync (e.g. `acknowledgeAlert`, `resolveAlert`, `reassignAlert`, `addComment`, `updateSeverity`, `snoozeAlert`). Each connector type defines only the sync actions that its provider's API supports.

#### Fetch Actions & Workflow Integration

Connectors expose **fetch actions** as their primary execution interface. A fetch action encapsulates the logic for calling the external system's API and returning a set of alerts.

These fetch actions are designed to be composable — they can be used as **steps within workflows**. This means:

- **Workflows can orchestrate fetches** — a workflow step can invoke a connector's fetch action to pull alerts from an external system as part of a broader automation pipeline.
- **Chaining & transformation** — fetch results from one step can feed into subsequent workflow steps (e.g. fetch → enrich → deduplicate → persist).
- **Reusability** — the same fetch action can be referenced by multiple workflows, keeping connector logic decoupled from workflow orchestration logic.

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Workflow     │       │  Connector       │       │  External System │
│              │       │                  │       │                  │
│  Step 1: ────┼──────▶│  Fetch Action ───┼──────▶│  GET /alerts     │
│  Fetch       │◀──────┼── Alert Payload  │◀──────┼── Response       │
│              │       │                  │       │                  │
│  Step 2: ────┼──┐    └──────────────────┘       └──────────────────┘
│  Enrich      │  │
│              │  │
│  Step 3: ────┼──┘
│  Persist     │
└──────────────┘
```

#### Ingestion Modes

External alert ingestion supports two complementary modes:

| Mode | Mechanism | Trigger | Connector Role |
|------|-----------|---------|----------------|
| **Pull** | Fetch actions | Workflow step, scheduled task, or on-demand invocation | Connector's fetch actions call the external system's API to retrieve alerts |
| **Push** | `configureWebhook` action + `alert_events` API | External system sends alerts to Kibana via installed webhook | Connector installs webhook on external system; Kibana receives alerts at `alert_events` API |

**Pull mode** is powered by the connector fetch actions described above. A workflow step (or other orchestrator) invokes a fetch action, which calls out to the external system and returns alerts.

**Push mode** allows external systems to send alerts directly into Kibana without Kibana initiating the request. Each connector will expose a **`configureWebhook` action** that, when invoked, installs a webhook on the external system. Once installed, the external system will push alerts to a **dedicated `alert_events` API** in Kibana.

```
┌──────────────────┐                          ┌──────────────────┐
│  Kibana           │    configureWebhook      │  External System │
│                  │    action                 │                  │
│  Connector ──────┼─────────────────────────▶│  Registers       │
│                  │  (installs webhook        │  webhook for     │
│                  │   on external system)     │  alert events    │
│                  │                           │                  │
│  alert_events    │◀─────────────────────────┤  Pushes alerts   │
│  API             │    HTTP POST              │  via webhook     │
└──────────────────┘                          └──────────────────┘
```

The push flow consists of two phases:

1. **Setup** — User invokes the connector's `configureWebhook` action (e.g. as a workflow step or manual action). The connector authenticates with the external system using its stored credentials and registers a webhook pointing to Kibana's `alert_events` API endpoint.
2. **Ongoing delivery** — The external system sends alert payloads to the `alert_events` API whenever new alerts fire. Kibana receives, validates, and feeds them into the standard processing pipeline.

Both modes ultimately feed into the same downstream processing pipeline (normalisation, deduplication, persistence), ensuring a consistent internal representation regardless of how alerts arrive.

#### Webhook Lifecycle Management

Webhooks installed on external systems require active lifecycle management to avoid orphaned registrations, stale endpoints, and silently broken push-mode ingestion.

##### Installation & Removal

**`uninstallWebhook` action** — Each connector that supports `installWebhook` must also expose an `uninstallWebhook` action that deregisters the webhook from the external system. This action authenticates with the external system using the connector's stored credentials and removes the previously registered webhook.

**User confirmation before deletion** — When a user attempts to delete a connector that has an active webhook installed on an external system, the Kibana UI should display a confirmation warning indicating that a webhook is registered on the external system and will be removed as part of deletion. This ensures users are aware of the external side-effects before proceeding.

**Automatic cleanup on connector deletion** — Upon user confirmation, Kibana should automatically invoke the `uninstallWebhook` action as part of the deletion flow. This prevents the external system from continuing to push alerts to an endpoint that is no longer managed or validated.

```
Connector Deletion Flow:

  User initiates connector deletion
        │
        ▼
  UI warns: "This connector has a webhook installed
  on [external system]. Deleting will attempt to
  remove the webhook. Proceed?"
        │
        ▼
  User confirms
        │
        ▼
  Invoke uninstallWebhook action
        │
        ├── Success → webhook removed from external system
        │                    │
        │                    ▼
        │              Delete connector saved object
        │
        └── Failure → log warning, proceed with deletion
                             │
                             ▼
                       Delete connector saved object
                       (orphaned webhook on external system)
```

##### Health Checks

Once a webhook is installed on an external system, Kibana has no guarantee it will remain in place. Webhooks can be deleted manually by administrators on the external system, removed by automated cleanup policies, or lost during external system migrations. Kibana must periodically verify webhook health and inform the user when a webhook is no longer active.

**`checkWebhook` action** — Each connector type that supports `installWebhook` should also expose a `checkWebhook` action that queries the external system to confirm the webhook still exists and is active. This action authenticates with the external system using the connector's stored credentials and returns the current status of the registered webhook.

**Periodic health checks** — Kibana should run webhook health checks on a configurable schedule (e.g. via a recurring task managed by Task Manager). Each check invokes the connector's `checkWebhook` action and persists the result to the connector's saved object. The health check cadence should be tunable per connector type, since some external systems may have stricter rate limits or slower APIs.

**Health states** — A connector's webhook status should be tracked as one of the following:

| State | Meaning |
|-------|---------|
| **Active** | Webhook confirmed present and configured correctly on the external system |
| **Degraded** | Webhook exists but its configuration does not match expectations (e.g. wrong callback URL, missing event types) |
| **Missing** | Webhook no longer exists on the external system |
| **Unknown** | Health check could not be completed (e.g. external system unreachable, auth failure) |

**Passive detection signals** — In addition to active polling via `checkWebhook`, Kibana can passively detect webhook issues through:

- **Delivery gap detection** — If a push-mode connector has not received any events at the `alert_events` API within an expected time window, it may indicate the webhook was removed or disabled.
- **Error responses** — If the external system begins returning errors when Kibana attempts other actions (e.g. fetch), this may correlate with webhook removal.

**User experience** — Webhook health status should be surfaced in two places:

*Connector management UI:*

- A health badge on each connector card/row (e.g. green for Active, yellow for Degraded, red for Missing, grey for Unknown).
- A detail panel showing last check timestamp, current state, and any error details.
- When the webhook is Missing, a prominent **"Reinstall webhook"** action that invokes `installWebhook` to re-register it.
- When the webhook is Degraded, a **"Reconfigure webhook"** action that performs the `uninstallWebhook` → `installWebhook` cycle.

*Alerts page:*

- When one or more external alert connectors have a webhook in a non-Active state (Missing, Degraded, or Unknown), a warning banner should appear on the alerts page informing the user that 3rd party alerts may not be arriving as expected.
- The banner should identify the affected connector(s) by name and current health state, e.g. _"Webhook for [Connector Name] is missing — external alerts from this source may not be received."_
- The banner should link directly to the affected connector's detail page in the connector management UI so the user can take action (reinstall or reconfigure) without navigating manually.
- If all external alert connectors are healthy, no banner is shown.

```
Webhook Health Check Flow:

  Task Manager triggers periodic health check
        │
        ▼
  Invoke checkWebhook action on connector
        │
        ├── Webhook active & correct config → state: Active
        │
        ├── Webhook exists, config mismatch → state: Degraded
        │        │
        │        ▼
        │   Surface "Reconfigure webhook" in UI
        │
        ├── Webhook not found → state: Missing
        │        │
        │        ▼
        │   Surface "Reinstall webhook" in UI
        │
        └── Check failed (timeout, auth error) → state: Unknown
                 │
                 ▼
            Log warning, retry on next scheduled check
```

##### Key Considerations

- **Best-effort cleanup** — If the external system is unreachable during connector deletion, the `uninstallWebhook` call may fail. Deletion should still proceed (we should not block connector removal on external system availability), but a warning should be logged and surfaced to the user.
- **Endpoint contract stability** — The `alert_events` API is a public endpoint that external systems will call autonomously once a webhook is installed. It must maintain a **stable, backwards-compatible contract** so that existing webhooks continue to function across Kibana upgrades without requiring reinstallation. If breaking changes are unavoidable, the API should be **versioned** (e.g. `/api/alert_events/v1`, `/api/alert_events/v2`), allowing webhooks to operate against the version they were registered with.
- **Orphan detection** — The periodic health checks described above serve as the primary orphan detection mechanism, identifying webhooks still registered on external systems for connectors that no longer exist and vice versa.
- **Rate limiting** — All outbound calls to external systems — including `checkWebhook` health checks and `fetch` actions — should respect the external system's rate limits. Fetch actions are particularly susceptible since they may be invoked on recurring schedules or triggered by multiple workflows targeting the same external system. The Connectors V2 framework (`@kbn/connector-specs`) already provides `RateLimitPolicy` and `RetryPolicy` on the `ConnectorSpec`, supporting configurable backoff strategies, retry status codes, and rate-limit detection via headers or status codes — external alert connectors should leverage these policies for all outbound actions.
- **Credential rotation** — A health check failure due to authentication errors may indicate that the connector's stored credentials have been revoked or rotated on the external system, not necessarily that the webhook is missing. The UI should distinguish between auth-related failures and webhook-not-found responses where possible.
- **Bulk checks** — If many connectors target the same external system, health checks should be staggered or batched to avoid overwhelming the external API.

### Pull Mechanism — Implementation Details

Each 3rd party connector must implement a **`fetchAlerts`** action as the standard interface for pull-based alert ingestion. This action is responsible for calling the external system's API, retrieving alerts, and returning them in a format that downstream processing can consume.

#### `fetchAlerts` Action Contract

Every external alert connector must expose a `fetchAlerts` action with the following responsibilities:

1. **Authenticate** with the external system using the connector's stored credentials
2. **Query** the external system's alerts API (applying any filters, time ranges, or pagination as needed)
3. **Return** alert records in the **Option 2 output schema** (see below)

#### Output Schema (Option 2: Provider-native + `alert`)

Each alert record returned by `fetchAlerts` contains three layers:

1. **Provider-native fields** (top level) — The alert expressed in the 3rd party's business domain, using terms and field names familiar to existing users of that system.
2. **`alert`** — A pre-mapped representation of the alert in the canonical Kibana alert schema. Enables cross-provider features (dashboards, rules, views) to work immediately without a separate normalisation step. Workflows can override or enrich this mapping in a later step if needed.
3. **`_source`** — The complete, unmodified payload from the external system. Follows the Elasticsearch convention — familiar to Elastic users as "the original document."

```
fetchAlerts output (per record):
{
  // Provider-native fields (top level)
  id: "PD-12345",
  urgency: "high",              // PagerDuty term
  service: { ... },             // PagerDuty structure
  created_at: "2026-03-12T...",

  // Canonical Kibana alert mapping
  alert: {
    alertId: "PD-12345",
    severity: "high",
    source: "pagerduty",
    summary: "CPU threshold exceeded on web-prod-3",
    ...
  },

  // Full unmodified 3rd party payload
  _source: { ... }
}
```

**Why this structure:**

- **`_source`** — Users and downstream consumers are not limited to the fields selected for normalisation. Any data the 3rd party provides is accessible. When normalisation logic is suspected of dropping or misinterpreting data, the original payload is always available for comparison. If the external system adds new fields, they are immediately available without requiring a connector update.
- **`alert`** — Cross-provider features can key off a consistent schema right away. Connector authors provide a best-effort mapping; workflows can refine it in subsequent steps.
- **Provider-native top level** — Users already familiar with the 3rd party see the vocabulary they expect, making external alerts feel native to the source system.

#### Per-Provider Implementation

Each 3rd party system will have its own `fetchAlerts` implementation tailored to that provider's API:

| Provider | API Style | Notes |
|----------|-----------|-------|
| <!-- TBD --> | <!-- REST / GraphQL / etc. --> | <!-- Provider-specific considerations --> |

Provider-specific concerns that each `fetchAlerts` implementation must handle:

- **Authentication** — Different providers use different auth mechanisms (API key, OAuth, basic auth). The `fetchAlerts` handler receives these via `ActionContext.secrets`.
- **Pagination** — Some providers return paginated results. `fetchAlerts` must handle pagination transparently, fetching all available pages up to a configurable limit.
- **Filtering** — Where supported, `fetchAlerts` should push filters down to the external API (e.g. time range, severity, status) to minimise data transfer.
- **Rate limits** — Handled by the connector's `RetryPolicy` and `RateLimitPolicy` (see Key Considerations above).

#### Open Questions — Pull Mechanism

- What is the common output schema for `fetchAlerts` across all providers?
- Should `fetchAlerts` accept a standardised input schema (e.g. time range, severity filter) that each provider maps to its own API parameters?
- How do we handle incremental fetches (e.g. cursor-based, last-fetched timestamp) to avoid re-fetching the same alerts?
- What is the maximum batch size / page limit per fetch invocation?

#### Open Questions — Ingestion

- **Push mode security** — How do we authenticate/validate incoming webhook payloads at the `alert_events` API (e.g. shared secret, HMAC signature)?
- **Webhook lifecycle** — How do we handle webhook deregistration, health checks, or re-registration if the external system loses the webhook config?
- How do we normalise external alert payloads into a common internal schema?
- What is the retry / error-handling strategy for failed fetches (pull) or missed deliveries (push)?
- How do we handle de-duplication of alerts across polling cycles (pull) or duplicate pushes (push)?

### External Alert Lifecycle Classification

Many 3rd party alerting systems pre-classify their alerts with lifecycle state — PagerDuty sends `triggered` / `acknowledged` / `resolved`, Grafana sends `alerting` / `ok` / `pending`, Datadog sends `Alert` / `Warn` / `OK`, and so on. Rather than discarding this classification and re-evaluating state from scratch, external alerts should **preserve and map** the source system's lifecycle classification into our canonical alert event statuses.

#### Canonical Alert Event Statuses

The `alerting_v2` Director operates on three canonical alert event statuses:

| Alert Event Status | Description |
|--------------------|-------------|
| `breached`         | The alert condition has been met (threshold exceeded, issue detected) |
| `recovered`        | The alert condition is no longer met (issue resolved) |
| `no_data`          | No data was available to evaluate the condition |

These event statuses drive the Director's episode state machine, which manages episode lifecycle through: `inactive` → `pending` → `active` → `recovering` → `inactive`.

#### Treatment as `kind: 'alert'`

Where a 3rd party system provides pre-classified lifecycle state, external alerts should be treated as **`kind: 'alert'`** — the same kind used by internally-generated alerts. However, external alerts **do not pass through the Director's state machine**. The Director is designed to *determine* lifecycle state from raw evaluation signals (e.g. ES|QL query results) — for external alerts, the 3rd party has already made that determination.

Instead, external alerts are ingested through a **separate ingestion path** that:

- Maps the 3rd party's pre-classified status directly to a canonical alert event status (`breached`, `recovered`, `no_data`).
- Writes the alert event to the alert events index with the mapped status already set — no Director transition logic is applied.
- Preserves the source system's episode context (see Episode ID Assignment below) rather than deriving episode state through the Director's `inactive` → `pending` → `active` → `recovering` state machine.

The result is that external alert events share the **same data model and index** as internal alerts (`type: 'alert'`), making them visible to downstream consumers (notification policies, alert tables, episode views) without any special handling. The difference is purely in how they arrive — internal alerts flow through the rule execution pipeline and Director; external alerts bypass both and are written directly after status mapping.

#### Provider Status Mapping

Each external alert connector must define a **status mapping** that translates the 3rd party's domain-specific lifecycle vocabulary into our canonical alert event statuses. For example:

| Provider | Source Status | → Canonical Status |
|----------|-------------|-------------------|
| PagerDuty | `triggered` | `breached` |
| PagerDuty | `acknowledged` | `breached` |
| PagerDuty | `resolved` | `recovered` |
| Grafana | `alerting` | `breached` |
| Grafana | `pending` | `breached` |
| Grafana | `ok` / `normal` / `resolved` | `recovered` |
| Grafana | `no_data` | `no_data` |
| Datadog | `Alert` / `Warn` | `breached` |
| Datadog | `OK` | `recovered` |
| Datadog | `No Data` | `no_data` |

This mapping is defined **per connector type** as part of the connector specification, not configured dynamically at runtime. Connector authors provide the mapping; it ships with the connector.

**Fallback behaviour** — If a 3rd party sends an alert with an unrecognised status string, the connector should default to `breached`. It is safer to surface a potentially spurious alert than to silently discard or misclassify one.

#### Episode ID Assignment

Each external alert event should be ingested with a **unique episode ID where possible**. The goal is to correctly group related events (e.g. a breach and its corresponding recovery) into a single episode for downstream consumers.

**When the 3rd party provides an episode/incident identifier:**

Many external systems assign their own incident or alert instance IDs that group related events into a single episode (e.g. PagerDuty's incident ID, OpsGenie's alert ID). When available, the connector's `fetchAlerts` implementation should extract this identifier and pass it through as the episode ID. This preserves the source system's episode grouping, ensuring that a breach event and its corresponding recovery event are linked to the same episode.

**When the 3rd party does not provide an episode identifier:**

Some systems emit stateless event streams with no concept of episodes. In this case, the episode ID must be derived during ingestion. The ingestion path should compute a **deterministic episode ID** from a combination of:

- The alert's `group_hash` (identity of the affected entity)
- The last known episode state for that group hash (looked up from the alert events index)

When a `breached` event arrives and no active episode exists for that group hash, a new episode UUID is generated. When a `breached` or `recovered` event arrives and an active episode already exists for that group hash, the existing episode ID is carried forward.

```
External alert event ingestion:

  3rd party event arrives
        │
        ▼
  Map source status → canonical status (breached | recovered | no_data)
        │
        ▼
  Derive group_hash from alert identity fields
        │
        ├── Has source episode/incident ID?
        │         │
        │         ├── Yes → use as episode ID
        │         │
        │         └── No → look up last episode for group_hash
        │                   ├── Active episode exists → carry forward episode ID
        │                   └── No active episode → generate new episode UUID
        │
        ▼
  Write AlertEvent directly to alert events index:
    - status: mapped canonical status
    - group_hash: derived from alert identity fields
    - episode.id: source episode ID or derived
    - type: 'alert'
        │
        ▼
  Available to notification policies, alert tables,
  episode views (same index as internal alerts)
```

#### Alerts Without Pre-Classified Lifecycle

Not all 3rd party systems pre-classify their alerts with lifecycle state. Some emit raw events or metrics without an explicit `firing` / `resolved` signal. For these sources:

- If the external system only emits "problem detected" events with no corresponding recovery event, each event should be ingested as `breached`. Recovery must then be determined through a separate mechanism — either a configurable **auto-recovery timeout** (e.g. "if no new breach event arrives within N minutes, generate a synthetic `recovered` event") or an explicit user action.
- If the external system provides a severity or priority but no lifecycle state, the severity should be mapped to the canonical severity field on the alert event, but the status should still default to `breached` for any non-informational alert.

These edge cases are provider-specific and should be documented in each connector's specification.

### Bidirectional Sync

External alerts are not read-only artifacts — users need to take action on them (acknowledge, resolve, reassign, comment) from within Kibana, and those actions must propagate back to the originating 3rd party system. Bidirectional sync ensures that the state of an alert stays consistent across both Kibana and the external system, regardless of where the change originates.

#### Outbound Actions (Kibana → External System)

Bidirectional sync is accomplished through the **connector model**. Each external alert connector defines a set of **outbound actions** that represent operations a user can perform on an alert within the 3rd party system. These actions are invoked from Kibana and executed against the external system's API using the connector's stored credentials.

| Action | Description | Example |
|--------|-------------|---------|
| `acknowledgeAlert` | Mark an alert as acknowledged in the external system | PagerDuty: acknowledge incident |
| `resolveAlert` | Close or resolve an alert in the external system | Datadog: set monitor status to OK |
| `reassignAlert` | Change the assignee or escalation target | PagerDuty: reassign incident to a different user/team |
| `addComment` | Attach a note or comment to the alert | OpsGenie: add note to alert |
| `updateSeverity` | Change the alert's severity/priority level | Grafana: update alert rule priority |
| `snoozeAlert` | Temporarily silence or suppress the alert | Datadog: mute monitor for a duration |

Each connector type defines **only the actions that its external system supports**. Not all actions are available for every provider — the set of available actions is part of the connector specification and is discoverable at runtime.

```
Outbound action flow:

  User takes action in Kibana UI
  (e.g. acknowledges an external alert)
        │
        ▼
  Kibana invokes connector action
  (e.g. acknowledgeAlert)
        │
        ▼
  Connector authenticates with external system
  using stored credentials
        │
        ▼
  Connector calls external system's API
  (e.g. PUT /incidents/{id}/acknowledge)
        │
        ├── Success → update local alert state optimistically
        │
        └── Failure → surface error to user, retain original state
```

#### Inbound Sync (External System → Kibana)

When a user or automation updates an alert directly in the 3rd party system (e.g. resolves an incident in PagerDuty's UI), those changes must flow back into Kibana. This is accomplished through the **existing push and pull ingestion mechanisms** — no separate sync channel is needed.

- **Push mode** — If a webhook is installed, the external system sends updated alert events to Kibana's `alert_events` API whenever alert state changes. The updated event carries the new lifecycle status (e.g. `resolved`), which is mapped to a canonical status and written to the alert events index, updating the alert's state in Kibana.
- **Pull mode** — If the connector operates in pull mode, the next scheduled `fetchAlerts` invocation retrieves the updated alert state from the external system. The fetch action returns the alert with its current status, and the processing pipeline detects the state change and updates the alert events index accordingly.

In both cases, the standard ingestion pipeline handles **status mapping**, **episode ID continuity**, and **deduplication**, ensuring that state changes originating from the external system are processed identically to those originating from initial alert ingestion.

```
Bidirectional sync — full cycle:

  ┌──────────────────────────────────────────────────────────────┐
  │                         Kibana                               │
  │                                                              │
  │  User action ──▶ Connector action ──▶ External system        │
  │  (acknowledge)    (acknowledgeAlert)   (PUT /incidents/...)  │
  │                                                              │
  │                                                              │
  │  alert_events  ◀── Push (webhook) ◀── External system        │
  │  index updated     or Pull (fetch)     state changed         │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

#### Workflow Integration

Outbound actions are designed to be **composable within workflows**, following the same pattern as fetch actions. A workflow step can invoke any connector action as part of an automation pipeline. For example:

- A notification policy triggers → workflow step invokes `acknowledgeAlert` on the external system automatically.
- An alert auto-recovers in Kibana → workflow step invokes `resolveAlert` to close the corresponding incident in the 3rd party system.
- A user adds a comment in Kibana → workflow step invokes `addComment` to mirror the note in the external system.

#### Key Considerations

- **Eventual consistency** — Bidirectional sync is inherently eventually consistent. There will be a window between when an action is taken on one side and when it is reflected on the other. The system should not assume instantaneous consistency and should handle stale reads gracefully.
- **Conflict resolution** — If both sides update the same alert concurrently (e.g. a user resolves in Kibana while another resolves in PagerDuty), the system should adopt a **last-write-wins** strategy based on event timestamps. Since both updates converge to the same state in most cases (e.g. both resolve the alert), true conflicts are rare. For cases where states diverge, the most recent event timestamp from either side takes precedence.
- **Optimistic local updates** — When a user takes an outbound action in Kibana, the local alert state should be updated optimistically (before confirmation from the external system) to provide responsive UX. If the outbound action fails, the optimistic update is rolled back and the user is notified.
- **Action availability** — The set of available outbound actions for a given alert should be determined by the connector type and the alert's current state. For example, an already-resolved alert should not offer an `acknowledgeAlert` action. The UI should query the connector for available actions given the alert's current state.
- **Audit trail** — All outbound actions should be logged to provide a complete audit trail of actions taken on external alerts, including who initiated the action, when, and whether it succeeded or failed.
- **Idempotency** — Outbound actions should be idempotent where possible. If a retry is needed (e.g. due to a transient network failure), re-invoking the same action should not produce unintended side effects.

### Data Flow

<!-- Describe how external alerts flow from connectors through processing and into the alerting pipeline -->

### API Design

<!-- Outline the API surface for external alerts (routes, request/response shapes) -->

### Data Model

<!-- Describe saved objects, ES indices, or other persistence mechanisms -->

### Integration Points

<!-- How external alerts interact with existing alerting_v2 subsystems (dispatcher, director, rule executor, etc.) -->

## Security Considerations

<!-- AuthZ, AuthN, space isolation, privileges -->

### Versioning

The Connectors V2 framework (`@kbn/connector-specs`) does not currently include a versioning mechanism — the `ConnectorSpec` interface has no `version` field, and connector types are registered without any version metadata. This gap must be addressed before external alert connectors can safely evolve, because two distinct change vectors require version tracking:

**A. `alert_events` API versioning** — The `alert_events` endpoint is a public contract that external systems call autonomously once a webhook is installed. When the API must evolve (e.g. new required fields, changed payload structure, updated validation), a new version of the endpoint should be introduced. Connectors need to record which API version they registered their webhook against so that:

- Existing webhooks continue operating against the version they were installed with.
- Kibana can detect connectors still pointing at a deprecated API version and prompt the user to reconfigure.
- Multiple API versions can coexist during the transition window.

**B. `installWebhook` action versioning** — The `installWebhook` action freezes two contracts at installation time: the external system's registration API (e.g. required fields, endpoints, auth schemes) and the **payload template** baked into the webhook. Many external systems (e.g. Datadog) allow the connector to define a payload schema at registration time that the external system then uses autonomously for every subsequent push. If the connector evolves to expect a different payload shape (e.g. adding new fields, restructuring the schema, renaming keys), existing webhooks will continue pushing the old shape silently — unlike a registration API change that would fail loudly. Connectors need to track the action version used at installation time so that:

- Kibana can compare the installed version against the current connector type's expected version.
- Outdated installations are surfaced to the user with a clear reconfiguration path — particularly when the payload template has changed and downstream features depend on fields that weren't included in earlier versions.
- The `uninstallWebhook` → `installWebhook` cycle uses the correct contract for each step.

**Proposed approach** — Extend the `ConnectorSpec` interface (or introduce a parallel mechanism) to support version metadata at the connector type level. At minimum, this should include:

- A **connector spec version** (e.g. semantic version or monotonic integer) that increments when the connector's actions, schema, or external contract assumptions change.
- Per-action **version tracking** that is persisted to the connector saved object at execution time (e.g. recording the `installWebhook` version when a webhook is installed).
- A **comparison mechanism** that runs at connector load time to detect version mismatches between the persisted state and the current connector type definition.

This versioning layer is a prerequisite for safely evolving both the `alert_events` API and individual connector actions over time.

## Open Questions

- <!-- Question 1 -->
- <!-- Question 2 -->

## Future Work

- <!-- Planned follow-ups or enhancements -->

## References

- <!-- Links to related issues, RFCs, design docs -->
