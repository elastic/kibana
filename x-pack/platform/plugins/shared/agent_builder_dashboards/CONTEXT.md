# Dashboards in Chat

Agent-authored Kibana dashboards: the conversation, attachments, and tools that compose and change them.

## Language

**Prettify**:
A button-started polish session: new chat, live dashboard plus a painted screenshot, auto-sent prompt (`/dashboard-management prettify this dashboard`). The outer agent judges that screenshot and applies one Generate. Without the image it is a normal dashboard edit, not Prettify.
_Avoid_: Enhance (button label only), prettify_dashboard tool, generate_dashboard mode, dashboard_screenshot type, forked attachment, layout-only pretty without an image, screenshot-before-render, inner review/planner

**Dashboard Finding**:
Something the outer agent sees in the painted screenshot. A **Hard rule** must be fixed; a **Creative** finding (including title-intent vs painted content) may be skipped. Prefer modify and expand; do not remove visualization panels.
_Avoid_: structured findings catalog (`pack_layout`, `metric_fill`, …), layout flags (`hide_title`, `clear_metric_fill`, `metric_trendline`), title-only polish, incomplete pack

**Generate**:
The only mutator: ordered operations that create or update a dashboard attachment in place. Prettify uses it once. Visual changes are natural-language panel edits; layout is a complete packed grid plus section moves.
_Avoid_: prettify_dashboard, review_dashboard, inner planner, restyle-via-layout-flags

**Dashboard Attachment**:
The conversation's working copy of a dashboard. Chat context shows a compact summary (title, description, panel count); Generate reads the full payload server-side. A Prettify result is a new version of the same attachment, not a saved-object write.
_Avoid_: forked attachment, dumping the full JSON into the outer transcript
