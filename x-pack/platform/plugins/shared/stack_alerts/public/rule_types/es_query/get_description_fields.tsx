/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import { RULE_DESCRIPTION_FIELD_TYPES } from '@kbn/triggers-actions-ui-plugin/public/common/constants/rule_definition_field_types';

export const getDescriptionFields: GetDescriptionFieldsFn = ({ rule, contentWrappers }) => {
  if (!rule) return [];

  const {
    customQuery: CustomQueryWrapper,
    indexPattern: IndexPatternWrapper,
    indexPatternItem: IndexPatternItemWrapper,
  } = contentWrappers;

  if (rule.params.searchType === 'esQuery') {
    return [
      {
        type: RULE_DESCRIPTION_FIELD_TYPES.INDEX_PATTERN,
        description: (
          <IndexPatternWrapper>
            {(rule.params.index as string[]).map((index) => (
              <IndexPatternItemWrapper>{index}</IndexPatternItemWrapper>
            ))}
          </IndexPatternWrapper>
        ),
      },
      {
        type: RULE_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY,
        description: <CustomQueryWrapper>{rule.params.esQuery as string}</CustomQueryWrapper>,
      },
    ];
  }

  if (rule.params.searchType === 'esqlQuery') {
    return [
      {
        type: RULE_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY,
        description: (
          <CustomQueryWrapper>
            {(rule.params.esqlQuery as { esql: string }).esql}
          </CustomQueryWrapper>
        ),
      },
    ];
  }

  // Data View
  if (rule.params.searchType === 'searchSource') {
    return [];
  }

  return [];
};
