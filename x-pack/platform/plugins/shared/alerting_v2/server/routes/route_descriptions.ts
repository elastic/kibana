/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION =
  'Indicates an invalid schema or parameters.';

interface PatchExamples {
  partialNested: string;
  clearLeaf: string;
  clearObject: string;
}

const patchSemanticsDescription = ({ partialNested, clearLeaf, clearObject }: PatchExamples) =>
  `Apply a partial update. A field you omit keeps its stored value, and that applies at every level: send \`${partialNested}\` to change one leaf while leaving its siblings alone. Send \`null\` to clear a field, again at any level: \`${clearLeaf}\` clears a single leaf, while \`${clearObject}\` clears a whole object. Lists and variant objects are replaced as a unit rather than merged, since a partly-sent variant could never be valid. The merged result is validated as a whole, so a patch that would leave the resource invalid is rejected with a \`400\` and nothing is stored.`;

export const RULE_PATCH_SEMANTICS_DESCRIPTION = patchSemanticsDescription({
  partialNested: '{"metadata": {"name": "Disk pressure"}}',
  clearLeaf: '{"metadata": {"description": null}}',
  clearObject: '{"grouping": null}',
});

export const ACTION_POLICY_PATCH_SEMANTICS_DESCRIPTION = patchSemanticsDescription({
  partialNested: '{"matcher": {"tags": ["prod"]}}',
  clearLeaf: '{"matcher": {"expression": null}}',
  clearObject: '{"matcher": null}',
});
