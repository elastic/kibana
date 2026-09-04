# Agent Builder Dashboards

Contains dashboard-related entities for the Agent Builder, including tools, attachment types, and a dashboard skill.

## Prettify

The dashboard agent reads the dashboard and screenshot attachments, assesses the existing
charts, and batches presentation/layout edits. It asks about specific additional charts only
when they would be useful and the user has not already chosen the scope. Styling does not
invoke visualization generation, data discovery, time-range selection, or a second review model.

The visualization server's `lens/chart_defaults.ts` defines per-chart `CHART_DEFAULTS` as
guidance, not executable presets. Both agents receive the same visual preferences, including
shared title, number-format, and color rules. The generator emits its chosen configuration;
Prettify emits explicit `set`/`remove` changes based on the screenshot and existing settings.
Chart types without specific preferences use only the common rules. Generation-only binding
rules and presentation-edit instructions remain separate from the shared visual preferences.
Neither flow automatically applies these preferences. Native Lens defaults and validation remain.
Metric charts are always titleless. XY charts hide axis titles and use bottom/outside legends;
most time-series lines become gradient areas, keeping at most one primary overview line.
Pie legends use auto visibility. Gauge min/max settings are omitted and goals require an
explicit request. Invented custom colors and mappings are removed unless the user requested them.

Example `platform.dashboard.generate_dashboard` update:

```json
{
  "dashboardAttachmentId": "dashboard-attachment-id",
  "operations": [{
    "operation": "edit_panels",
    "panels": [{
      "source": "config",
      "type": "vis",
      "panelId": "existing-panel-id",
      "config": {
        "changes": [{
          "operation": "set",
          "path": "legend.visibility",
          "value": "hidden"
        }]
      }
    }]
  }]
}
```

Changes address Lens API fields, not internal `visualization.*` state. There is no per-chart
path allowlist. Changes can set scalar values (or legend statistics) and remove settings;
object settings such as number formats are edited through their individual fields.
Each panel edit is validated with the native Lens schema and applied atomically;
failed panels remain unchanged. Unmentioned settings and panel IDs are preserved. Form-based
Lens charts support the same presentation edits. When removing arbitrary metric/table coloring, emit
explicit removals for both `color` and `apply_color_to`. Unsafe object paths and array growth
are rejected. Vega remains limited to panel chrome and layout.

The agent is instructed to preserve queries, data sources, filters, aggregations, chart families,
and layer membership. Column bindings are preserved except for optional gauge min/max/goal
removals required by the chart rules. Line-to-area restyling keeps the existing layer's data and
bindings. These are agent responsibilities, not semantic guarantees enforced by the editing tool;
Lens validation checks configuration validity.

Updates use the latest attachment payload and retain attachment version history. Existing
dashboards retain an absent or saved time range unless an operation explicitly changes it.

Use `update_panel_layouts` with `newSections`/`newSectionKey` to regroup existing panels
without regenerating them. The original screenshot is assessment input, not visual
verification of the updated dashboard.
