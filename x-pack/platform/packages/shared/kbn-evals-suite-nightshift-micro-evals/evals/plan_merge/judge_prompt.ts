/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Verbatim judge text from deductive-ai/deductive at a60f80265f5ebe5c4ce9be02b0a158be00e2d58c.

export const CONFLICT_USER =
  'Multiple terminal nodes are reached via ✅-marked edges: {taken_x}\n\nA CONFLICT exists when two mutually exclusive root-cause diagnoses are both marked as confirmed (✅). Conditional variants of the same diagnosis (e.g. X17=load-test-primary, X18=load-test-with-secondary-issue) are NOT conflicts.\n\nTree excerpt (first 3000 chars):\n{mermaid[:3000]}\n\nReply ONLY as JSON: {"conflict": true/false, "reason": "<one sentence>"}';

export const MUTATION_USER =
  'You are evaluating whether an AI correctly applied causal feedback to a decision tree.\n\nCAUSAL SUMMARY (the correct root cause + any structural edits requested):\n{causal_summary}\n\nMUTATION SPEC (constraints that must hold):\n{spec_summary}\n\nINITIAL TREE (before):\n{initial_tree[:1500]}\n\nEXPECTED REFERENCE TREE (after — for reference, exact match not required):\n{expected[:1200] if expected else \'(not provided)\'}\n\nACTUAL MERGED TREE:\n{mermaid[:2000]}\n\nRate 1-5:\n5 = Perfect: correct causal path ✅, wrong paths cleaned, structural edits applied, unrelated paths intact\n4 = Good: correct terminal ✅, minor issues (one extra ✅ on non-conflicting adjacent node)\n3 = Acceptable: mostly correct but one structural edit missed or one unrelated ✅ remains\n2 = Poor: correct terminal lacks ✅, OR explicitly-wrong terminal still has ✅\n1 = Bad: feedback ignored or tree broken\n\nReply ONLY as JSON: {"score": <1-5>, "reason": "<one sentence>"}';

export const SPEC_TEMPLATE =
  "Nodes that MUST appear: {spec.get('nodes_added', [])}\nNodes that MUST be absent: {spec.get('nodes_deleted', [])}\nCorrect terminal (must have ✅): {spec.get('correct_terminal', '')}\nTerminals that must NOT have ✅: {spec.get('terminals_without_checkmark', [])}\nPreserved nodes (must survive): {spec.get('preserved_node_ids', [])}";
