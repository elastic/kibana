/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVESTIGATION_TYPE_TEMPLATE_TAG } from '../../../../common/investigations/template_fields';

/** The tags the editor shows: every tag except the one that marks an investigation template. */
export const withoutInvestigationTag = (tags: readonly string[] | undefined): string[] =>
  (tags ?? []).filter((tag) => tag !== INVESTIGATION_TYPE_TEMPLATE_TAG);

/** The tags to save: the author's tags plus the tag that marks an investigation template. */
export const withInvestigationTag = (tags: readonly string[]): string[] => [
  INVESTIGATION_TYPE_TEMPLATE_TAG,
  ...withoutInvestigationTag(tags),
];
