# Prettify mutates only findings and layout

The single `generate_dashboard` in a Prettify session may edit panels named in Panel Findings and may pack/resize via layout operations. It must not restyle every Lens panel through the inner visualization agent, and it must not add or remove panels unless the user already agreed to adds.

Blanket restyle and from-scratch redesign were tried; they cost an inner LLM call per panel and are a generation, not a polish.
