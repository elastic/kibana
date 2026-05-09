# Cases Analytics v2

Cluster-level analytics indices for the cases plugin, populated by real-time
saved-object hooks with periodic reconciliation as the durability backstop.
Replaces the per-(space × owner) reindex pipeline at `server/cases_analytics/`.

## Status: under construction

v2 is gated by `xpack.cases.analyticsV2.enabled` (default `false`). v1
(`server/cases_analytics/`) remains the primary path until v2 has been validated
in production, after which v1 is removed.

## Surfaces (planned)

| Surface       | Index                | Source SO(s)                                          |
| ------------- | -------------------- | ----------------------------------------------------- |
| `case`        | `.cases`             | `cases`                                               |
| `activity`    | `.cases-activity`    | `cases-user-actions`                                  |
| `attachments` | `.cases-attachments` | `cases-comments` (legacy) + `cases-attachments` (v2)  |

The `case` surface is created with `index.mode: lookup` so it can serve as the
right-hand side of ES|QL `LOOKUP JOIN` queries from the activity / attachments
surfaces.

## Configuration

```yaml
xpack.cases.analyticsV2:
  enabled: false                 # default — set to true to opt in
```

When `enabled: false`, the v2 service is a no-op. Nothing registers, nothing
schedules, nothing writes.

## Authorization

Out of the box, only superusers can read the v2 indices — they're created hidden
and no Kibana feature privilege grants access. To allow specific users:

1. Define an Elasticsearch role with `read` on the relevant index pattern(s).
2. Map the role to the user via Kibana role management or the ES `_security` API.

A future PR will introduce document-level security (DLS) on `cases.owner` +
`kibana.space_ids` so end users only see cases they're entitled to. Until that
ships, role-granted access is unrestricted across cases — apply with care.

## File layout (today: scaffolding only)

```
cases_analytics_v2/
├── README.md          you are here
├── index.ts           public surface (CasesAnalyticsV2Service)
└── service.ts         lifecycle orchestrator (no behavior yet — skeleton)
```

This README expands as each surface lands.
