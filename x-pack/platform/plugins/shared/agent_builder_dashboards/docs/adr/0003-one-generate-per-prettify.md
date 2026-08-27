# One Prettify tool call per request

A Prettify session may run `platform.dashboard.prettify_dashboard` once. That tool inspects the painted dashboard and, when there are findings, mutates via the generate operations core in the same call. The outer agent must not call `generate_dashboard` for Prettify, and must not inspect the image itself.

If composition looks thin, Prettify still does not add panels. Ask whether to add charts in a later turn; new panels are a normal edit, not a second Prettify. Never review the original image after mutating — it is a stale picture.

This trades an outer review→generate loop for a hard stop on the generate loop that made the PoC unusable.
