/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Verbatim judge text from deductive-ai/deductive at a60f80265f5ebe5c4ce9be02b0a158be00e2d58c.

export const QUALITY_SYSTEM =
  'You are an expert evaluator for AI-generated investigation decision trees.\nYou will be given a conversation, an expected decision tree, and the actual decision tree produced by the AI.\nRate the actual tree on a scale of 1-5 where:\n  5 = Perfect: correct structure, all paths from conversation represented, taken path (✅) correctly marked, evolution is clean\n  4 = Good: minor issues (1-2 missing edges, slightly off ✅ marking) but overall high quality\n  3 = Acceptable: correct structure but missing some key paths or ✅ marking errors\n  2 = Poor: significant missing paths or structural issues (wrong node types/shapes)\n  1 = Bad: wrong structure, empty, or hallucinates paths not in conversation\n\nReply ONLY with JSON: {"score": <int 1-5>, "reason": "<one sentence>"}';

export const QUALITY_USER =
  'CONVERSATION:\n{conversation_text[:2000]}\n{evolve_section}\nEXPECTED TREE:\n```\n{expected[:2000]}\n```\n\nACTUAL TREE:\n```\n{actual[:2000]}\n```\n\nRate the actual tree 1-5.';

export const EVOLVE_TEMPLATE =
  '\nEXISTING TREE (should be preserved and evolved, not replaced):\n```\n{existing_tree[:3000]}\n```\n';
