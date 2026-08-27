# Dashboards in Chat

Agent-authored Kibana dashboards: the conversation, attachments, and tools that compose, inspect, and change them.

## Language

**Prettify**:
A button-started polish session whose signal is the auto-sent prompt and whose evidence is a generic image of the live dashboard after it has painted. Without that image it is not Prettify (a normal dashboard edit). The skill exposes it as `platform.dashboard.prettify_dashboard`: one call inspects the image and applies typed fixes to the same dashboard attachment. The outer agent does not translate findings into `generate_dashboard`.
_Avoid_: prettifyPanelConfigs, generate_dashboard mode, dashboard_screenshot type, forked attachment, layout-only pretty without an image (v1), screenshot-before-render, review-then-generate outer loop

**Dashboard Review**:
A sensor: a vision inspection of a rendered dashboard image plus the full dashboard attachment. It uses the same design practices as generate (chart types, composition, grid) by reference. It yields dashboard-level findings (`pack_layout`, `weak_sections`, `monotone_chart_types`, `weak_controls`) and panel-level invert / one-category / stacked titles / metric fill / sparse KPI (`wrong_chart_type`, `one_category_chart`, `duplicate_inner_title`, `metric_fill`, `thin_metric`). It does not mutate the dashboard. Prettify runs it internally, then maps kept findings to operations in code.
_Avoid_: review (bare), dashboard critique, judge, ES|QL-execution review, panel-only size nits, agent-facing review_dashboard tool

**Dashboard Finding**:
A structured visual defect with a typed `fix`. Layout is a complete packed grid for every panel, not a per-panel resize. Duplicate chrome+inner titles hide the panel chrome (`hide_title`); invented metric backgrounds are stripped (`clear_metric_fill`); sparse KPIs get a sparkline (`metric_trendline`). Title phrasing is not a finding. Prettify turns kept findings into one operations batch: `add_section` → `update_panel_layouts` → constrained `edit_panels` → `add_controls`.
_Avoid_: suggestion, critique, overall assessment, title-only polish, restyle-via-request, incomplete pack
