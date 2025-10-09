/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';

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
        title: 'Index patterns',
        description: (
          <IndexPatternWrapper>
            {(rule.params.index as string[]).map((index) => (
              <IndexPatternItemWrapper>{index}</IndexPatternItemWrapper>
            ))}
          </IndexPatternWrapper>
        ),
      },
      {
        title: 'Custom query',
        description: <CustomQueryWrapper>{rule.params.esQuery}</CustomQueryWrapper>,
      },
    ];
  }

  if (rule.params.searchType === 'esqlQuery') {
    return [
      {
        title: 'Custom query',
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
