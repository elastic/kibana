# Dashboards in Chat

Agent-authored Kibana dashboards: the conversation, attachments, and tools that compose and change them.

## Language

**Prettify**:
A button-started polish session whose signal is the auto-sent prompt (`/dashboard-management prettify this dashboard`) and whose evidence is a generic image of the live dashboard after it has painted. Without that image it is not Prettify (a normal dashboard edit). The outer agent looks at the screenshot, splits findings into Hard rule vs Creative, and applies them with one `platform.dashboard.generate_dashboard` call. Prefer modify and expand; do not remove visualization panels. `platform.dashboard.prettify_dashboard` is not registered — do not call it.
_Avoid_: unregistered prettify_dashboard tool, inner review/planner, generate_dashboard mode, dashboard_screenshot type, forked attachment, layout-only pretty without an image (v1), screenshot-before-render, code mapping findings to operations, layout flags (`hide_title`, `clear_metric_fill`, `metric_trendline`)

**Dashboard Finding**:
Something the outer agent sees in the painted screenshot (and the full dashboard JSON if it calls `attachments.read`). Hard-rule findings must be fixed; Creative findings (including title-intent vs painted content) may be skipped. Visual changes go through `edit_panels` (`source: "request"`) as natural language — the visualization author decides how to apply them. `update_panel_layouts` is grid + section moves only. Layout is a complete packed grid, not a per-panel resize.
_Avoid_: structured findings catalog (`pack_layout`, `metric_fill`, …), hide_title / clear_metric_fill / metric_trendline flags, title-only polish, incomplete pack
