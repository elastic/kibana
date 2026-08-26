# Dashboards in Chat

Agent-authored Kibana dashboards: the conversation, attachments, and tools that compose, inspect, and change them.

## Language

**Prettify**:
A button-started polish session whose signal is the auto-sent prompt and whose evidence is a generic image of the live dashboard after it has painted. Without that image it is not Prettify (a normal dashboard edit). The result is a new version of the same dashboard attachment.
_Avoid_: prettifyPanelConfigs, generate_dashboard mode, dashboard_screenshot type, forked attachment, layout-only pretty without an image (v1), screenshot-before-render

**Panel Review**:
A sensor: a vision inspection of a rendered dashboard image plus a catalog of what each panel is (chart type, grid, ES|QL). It yields panel-level visual findings. It does not mutate the dashboard. The dashboard-management skill exposes it; the Prettify prompt is what tells the agent to call it.
_Avoid_: review, review_dashboard, dashboard critique, judge

**Panel Finding**:
A structured visual defect for one panel: which panel, which rule (`disproportionate_size` or `wrong_chart_type`), what is wrong, and a concrete `fix`. Title phrasing and Kibana chrome are not findings. The main agent turns kept findings into `update_panel_layouts` or a single constrained `edit_panels`.
_Avoid_: suggestion, critique, overall assessment, title-only polish, restyle-via-request
