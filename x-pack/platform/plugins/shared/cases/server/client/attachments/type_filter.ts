/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import { toLegacyTypeMatches, type LegacyTypeMatch } from '../../../common/utils/attachments';
import { buildFilter, combineFilters, NodeBuilderOperators } from '../utils';

const commentsFilter = (field: string, values: string[]): KueryNode | undefined =>
  buildFilter({
    filters: values,
    field,
    operator: 'or',
    type: CASE_COMMENT_SAVED_OBJECT,
  });

const commentsMatchFilter = ({ type, field, values }: LegacyTypeMatch): KueryNode | undefined => {
  const typeFilter = commentsFilter('type', [type]);
  if (field == null || values == null || values.length === 0) {
    return typeFilter;
  }
  return combineFilters([typeFilter, commentsFilter(field, values)], NodeBuilderOperators.and);
};

/**
 * Find type filter: `cases-attachments` by unified type, `cases-comments` by the
 * mapped legacy type (and subtype/owner when comments rows share a type bucket).
 */
export const buildAttachmentTypeFilter = (types: string[] | undefined): KueryNode | undefined => {
  if (!types || types.length === 0) {
    return undefined;
  }

  const commentsSoFilter = combineFilters(
    types.flatMap(toLegacyTypeMatches).map(commentsMatchFilter),
    NodeBuilderOperators.or
  );

  const attachmentsSoFilter = buildFilter({
    filters: types,
    field: 'type',
    operator: 'or',
    type: CASE_ATTACHMENT_SAVED_OBJECT,
  });

  return combineFilters([commentsSoFilter, attachmentsSoFilter], NodeBuilderOperators.or);
};
