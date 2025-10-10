/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import { RULE_DETAIL_DESCRIPTION_FIELD_TYPES } from '@kbn/alerting-types/rule_detail_description_type';

export const getDescriptionFields: GetDescriptionFieldsFn = ({ rule, fieldWrappers }) => {
  if (!rule) return [];

  const {
    codeBlock: CodeBlockWrapper,
    indexPattern: IndexPatternWrapper,
    indexPatternItem: IndexPatternItemWrapper,
  } = fieldWrappers;

  if (rule.params.searchType === 'esQuery') {
    return [
      {
        type: RULE_DETAIL_DESCRIPTION_FIELD_TYPES.INDEX_PATTERN,
        description: (
          <IndexPatternWrapper>
            {(rule.params.index as string[]).map((index) => (
              <IndexPatternItemWrapper>{index}</IndexPatternItemWrapper>
            ))}
          </IndexPatternWrapper>
        ),
      },
      {
        type: RULE_DETAIL_DESCRIPTION_FIELD_TYPES.CUSTOM_QUERY,
        description: <CodeBlockWrapper>{rule.params.esQuery as string}</CodeBlockWrapper>,
      },
    ];
  }

  if (rule.params.searchType === 'esqlQuery') {
    return [
      {
        type: RULE_DETAIL_DESCRIPTION_FIELD_TYPES.ESQL_QUERY,
        description: (
          <CodeBlockWrapper>{(rule.params.esqlQuery as { esql: string }).esql}</CodeBlockWrapper>
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
