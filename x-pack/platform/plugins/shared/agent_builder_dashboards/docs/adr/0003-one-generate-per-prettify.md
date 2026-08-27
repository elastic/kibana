# One Prettify tool call per request

A Prettify session may run `platform.dashboard.prettify_dashboard` once. That tool inspects the painted dashboard, an inner planner writes `operations[]` from the findings (same generate operation schemas, not a code mapper), and the shared generate core applies them. The outer agent must not call `generate_dashboard` for Prettify, and must not inspect the image itself.

If composition looks thin, Prettify still does not add panels. Ask whether to add charts in a later turn; new panels are a normal edit, not a second Prettify. Never review the original image after mutating — it is a stale picture.

This keeps operation choice non-deterministic without another outer review→generate loop.
