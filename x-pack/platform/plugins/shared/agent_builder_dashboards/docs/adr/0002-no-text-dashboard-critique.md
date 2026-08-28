# Do not ship the text dashboard critique

The ES|QL-execution judge from PR #286004 (re-execute panel ES|QL, dump Lens configs, holistic LLM score, then another generate) is not Prettify and is not the visual-feedback loop. Prettify’s only sensor is the outer agent looking at the painted screenshot. Do not add a review_dashboard tool or an inner findings catalog.

Shipping both would stack generate → critique → generate, which already burned tokens and invented false ES|QL failures in the PoC. Keep PR #286004 as reference only.
