/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiTextArea } from '@elastic/eui';
import { isEmpty, chunk, get, pick } from 'lodash/fp';
import React, { memo, ReactNode } from 'react';
import styled from 'styled-components';

import {
  IIndexPattern,
  esFilters,
  Query,
  utils,
} from '../../../../../../../../../../src/plugins/data/public';

import { FilterLabel } from './filter_label';
import { FormSchema } from '../shared_imports';
import * as I18n from './translations';

interface StepRuleDescriptionProps {
  data: unknown;
  indexPatterns?: IIndexPattern;
  schema: FormSchema;
}

const EuiBadgeWrap = styled(EuiBadge)`
  .euiBadge__text {
    white-space: pre-wrap !important;
  }
`;

const EuiFlexItemWidth = styled(EuiFlexItem)`
  width: 50%;
`;

export const StepRuleDescription = memo<StepRuleDescriptionProps>(
  ({ data, indexPatterns, schema }) => {
    const keys = Object.keys(schema);
    return (
      <EuiFlexGroup gutterSize="none" direction="row" justifyContent="spaceAround">
        {chunk(keys.includes('queryBar') ? 3 : Math.ceil(keys.length / 2), keys).map(key => (
          <EuiFlexItemWidth grow={false}>
            <EuiDescriptionList
              listItems={buildListItems(data, pick(key, schema), indexPatterns)}
            />
          </EuiFlexItemWidth>
        ))}
      </EuiFlexGroup>
    );
  }
);

interface ListItems {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

const buildListItems = (
  data: unknown,
  schema: FormSchema,
  indexPatterns?: IIndexPattern
): ListItems[] =>
  Object.keys(schema).reduce<ListItems[]>(
    (acc, field) => [
      ...acc,
      ...getDescriptionItem(field, get([field, 'label'], schema), data, indexPatterns),
    ],
    []
  );

const getDescriptionItem = (
  field: string,
  label: string,
  value: unknown,
  indexPatterns?: IIndexPattern
): ListItems[] => {
  if (field === 'queryBar' && indexPatterns != null) {
    const filters = get('queryBar.filters', value) as esFilters.Filter[];
    const query = get('queryBar.query', value) as Query;
    const savedId = get('queryBar.saved_id', value);
    let items: ListItems[] = [];
    if (!isEmpty(filters)) {
      items = [
        ...items,
        {
          title: <>{I18n.FILTERS_LABEL}</>,
          description: (
            <EuiFlexGroup wrap responsive={false} gutterSize="xs">
              {filters.map((filter, index) => (
                <EuiFlexItem grow={false} key={`${field}-filter-${index}`}>
                  <EuiBadgeWrap color="hollow">
                    <FilterLabel
                      filter={filter}
                      valueLabel={utils.getDisplayValueFromFilter(filter, [indexPatterns])}
                    />
                  </EuiBadgeWrap>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ),
        },
      ];
    }
    if (!isEmpty(query.query)) {
      items = [
        ...items,
        {
          title: <>{I18n.QUERY_LABEL}</>,
          description: <>{query.query}</>,
        },
      ];
    }
    if (!isEmpty(savedId)) {
      items = [
        ...items,
        {
          title: <>{I18n.SAVED_ID_LABEL}</>,
          description: <>{savedId}</>,
        },
      ];
    }
    return items;
  } else if (field === 'description') {
    return [
      {
        title: label,
        description: <EuiTextArea value={get(field, value)} readOnly={true} />,
      },
    ];
  } else if (Array.isArray(get(field, value))) {
    return [
      {
        title: label,
        description: (
          <EuiFlexGroup wrap responsive={false} gutterSize="xs">
            {get(field, value).map((val: string) => (
              <EuiFlexItem grow={false} key={`${field}-${val}`}>
                <EuiBadgeWrap color="hollow">{val}</EuiBadgeWrap>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
    ];
  }
  return [
    {
      title: label,
      description: get(field, value),
    },
  ];
};
