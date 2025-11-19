# Streams Plugin

Provides server + client APIs to define, manage, and operate "streams" – structured, lifecycle‑managed Elasticsearch data streams plus associated metadata (assets, attachments, features) and higher level content abstractions.

## Purpose (High Level)
Streams formalize log/data ingestion into typed entities with:
- Validated definitions (classic vs wired modes) and lifecycle (ILM phases)
- Automated provisioning of component templates, index templates, ingest pipelines, and data stream assets
- Feature identification and query helpers (processor suggestions, field metadata)
- Attachments and auxiliary content (export/import, saved object layer)
- Telemetry & pricing tier integration (+ alerting rule types & global search)

## Key Server Services
- `StreamsService`: Core CRUD + wiring of classic/wired stream state.
- `AssetService` / `AttachmentService`: Manage stored assets & file/attachment metadata.
- `FeatureService`: Detect & persist stream features (fields, capabilities).
- `ContentService`: Export/import streams, content tree utilities.
- `QueryService`: Query helpers, building stream‑scoped searches.
- `ProcessorSuggestionsService`: Ingest pipeline processor suggestion logic.
- State Management (`lib/streams/state_management`): Active record + execution plan + permission translation.
- Templates & Pipelines (`component_templates`, `index_templates`, `ingest_pipelines`): Generation & reconciliation.
- Lifecycle (`lifecycle`): Effective lifecycle resolution & ILM phase utilities.
- Storage (`storage`): Migrations (`migrate_on_read`, `streamlang` evolution).
- Errors (`errors`): Typed domain errors for routing & status reporting.
- Rules (`lib/rules/esql`): ESQL rule executor & registration of Streams rule types.
- Significant Events (`lib/significant_events`): Dataset analysis & query generation via prompt templates.
- Telemetry (`lib/telemetry`): Event based + stats collection.

## Public Plugin
- Repository client wrapper for calling server route repository.
- Navigation enablement observable (space / serverless aware).
- Wired mode status & enable/disable endpoints.
- Exposes config$ and stream repository client to consumers.

## Common Layer
- `config.ts`: Schema & browser exposure.
- `constants.ts`: Feature IDs, privilege names, rule type IDs.
- Helpers for ingest processor suggestions & query building.

## Feature Registration & Security
- Registers Kibana feature (`STREAMS_FEATURE_ID`) with alerting capabilities & UI/API privileges (requires All Spaces).
- Integrates with licensing & pricing tier feature flags.

## Rough Directory Map
```
common/            Shared types, config, constants, helpers
server/plugin.ts   Registers services, routes, feature, telemetry, search provider
server/lib/streams Domain logic (assets, attachments, features, templates, pipelines, lifecycle, storage, state management, CRUD)
server/lib/content Content export/import & tree utilities
server/lib/rules   ESQL rule registration & execution
server/lib/significant_events Pattern & query generation for notable events
public/            Client plugin, navigation status, wired mode API, repository client
routes/            Server route repository (HTTP API surface)
```

## Notes
- All APIs are exposed through a route repository; consumers use the public `streamsRepositoryClient`.
- Privileges separate read vs manage; some actions gated by feature flags & licensing.
- Designed to be solution and serverless aware (navigation gating logic).

## Related Packages
- `@kbn/streamlang`: DSL for defining stream processing steps (conditions + action blocks) and transpiling them to ES|QL queries and ingest pipelines; used for simulation, enrichment, and evolution from classic to "wired" processing.
- `streams_app` plugin: UI application layer providing React hooks/components for managing streams, enrichment workflows (Grok/Dissect suggestions, simulation), navigation state, and end‑user interactions over the Streams server APIs.
- `@kbn/grok-heuristics`: Heuristic utilities to extract, group, and refine GROK patterns from sample log messages, feeding processor suggestions and enrichment previews in the Streams app.

## Field Types
Supported primitive mapping types for wired/classic (overrides) include: keyword, match_only_text, long, double, date, boolean, ip, geo_point, plus the special internal type system (system). Adding a namespaced OTel/ECS field auto‑creates stripped and ECS equivalent aliases; avoid redefining those aliases directly. The newly added `geo_point` type behaves like other primitives (no special validation rules) and can be defined in wired `ingest.wired.fields` or classic `field_overrides` mappings.