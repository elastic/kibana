# One generate per Prettify request

A Prettify session may run Panel Review once and `generate_dashboard` at most once. If composition looks thin, ask whether to add charts *before* that generate, then put fixes, layout, and any agreed adds in a single operations batch. Never run Panel Review on the original image after mutating — it is a stale picture, and new panels are not in it.

This trades “see the polish, then optionally add charts” for a hard stop on the generate loop that made the PoC unusable.
