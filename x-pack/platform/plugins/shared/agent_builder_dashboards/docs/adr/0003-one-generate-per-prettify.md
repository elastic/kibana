# One generate_dashboard call per Prettify request

A Prettify session may run `platform.dashboard.generate_dashboard` once. The outer agent inspects the painted screenshot, splits findings into Hard rule vs Creative, and writes `operations[]` in that one call. Do not call `platform.dashboard.prettify_dashboard` (it is not registered). Do not inspect-then-generate in a second outer loop.

If composition looks thin, still prefer modify and expand over deleting visualization panels. Ask whether to add more charts in a later turn when needed. Never review the original image after mutating — it is a stale picture.
