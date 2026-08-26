# Do not ship the text dashboard critique

`review_dashboard` (re-execute panel ES|QL, dump Lens configs, holistic LLM judge, then another generate) is not Prettify and is not the later visual-feedback loop. Prettify’s only sensor is Panel Review. The later interactive screenshot loop should reuse that sensor, not this judge.

Shipping both would stack generate → critique → generate, which already burned tokens and invented false ES|QL failures in the PoC. Keep PR #286004 as reference only.
