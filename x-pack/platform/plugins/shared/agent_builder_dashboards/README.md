# Agent Builder Dashboards

Contains dashboard-related entities for the Agent Builder, including tools, attachment types, and a dashboard skill.

## Prettify

The "Enhance this dashboard" button attaches the dashboard and a screenshot and sends
`/dashboard-management prettify this dashboard`. The dashboard agent then reads the
`dashboard-prettify.md` reference file of the skill and follows it: assess the screenshot and
payload, optionally ask once whether to also add specific charts, and batch presentation and
layout edits into one `generate_dashboard` call. Styling never invokes visualization generation,
data discovery, time-range selection, or a second review model.

### Where the prompts live

| Content | Source | Reaches the agent through |
| --- | --- | --- |
| Operations vocabulary, panel types, chart-type selection | `server/skills/generation_guidance/generation_guidance.ts` | skill body (always loaded) |
| Dashboard design: composition, panel layout, controls | `server/skills/generation_guidance/design/` | skill body (always loaded) |
| Prettify steps and dashboard review checklist | `server/skills/generation_guidance/prettify_guidance.ts` | `dashboard-prettify.md`, read on demand |
| Chart style rules (titles, number formats, colors, per-chart rules) | `agent-builder-visualizations-server/lens/chart_style_rules.ts` and `config_rules.ts` | `dashboard-prettify.md` and the chart generation prompt |
| Presentation edit syntax | `agent-builder-visualizations-server/lens/presentation.ts` | `dashboard-prettify.md` and the `edit_panels` schema |

The chart style rules are the single source of visual preferences: the chart generator applies
them to new charts, and Prettify applies them to existing ones. Generation-only data-binding rules
stay in `chart_type_registry.ts`.

### Presentation edits

Chart styling uses `edit_panels` with `source: "config"`, `type: "vis"`, and explicit
`set`/`remove` changes on Lens API fields:

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
        "changes": [{ "operation": "set", "path": "legend.visibility", "value": "hidden" }]
      }
    }]
  }]
}
```

`editLensPresentation` applies each panel's changes atomically, rejects unsafe paths and array
growth, validates the result with the native Lens schema, and leaves failed panels unchanged.
Unmentioned settings and panel IDs are preserved; form-based Lens charts are supported; Vega panels
accept only `title`, `description`, and `hide_title`. Keeping queries, data sources, and chart
families unchanged is an agent instruction, not a guarantee enforced by the tool.

`update_panel_layouts` with `newSections`/`newSectionKey` regroups existing panels without
regenerating them. Updates to existing dashboards keep the saved (or absent) time range; only new
dashboards get a data-aware default.
