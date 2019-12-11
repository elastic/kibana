/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextArea,
  EuiLink,
  EuiText,
  EuiListGroup,
} from '@elastic/eui';
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

import { IMitreEnterpriseAttack } from '../../types';
import { tacticsOptions, techniquesOptions } from '../../../mitre/mitre_tactics_techniques';

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

const MyEuiListGroup = styled(EuiListGroup)`
  padding: 0px;
  .euiListGroupItem__button {
    padding: 0px;
  }
`;

const ThreatsEuiFlexGroup = styled(EuiFlexGroup)`
  .euiFlexItem {
    margin-bottom: 0px;
  }
`;

export const StepRuleDescription = memo<StepRuleDescriptionProps>(
  ({ data, indexPatterns, schema }) => {
    const keys = Object.keys(schema);
    const listItems = keys.reduce(
      (acc: ListItems[], key: string) => [
        ...acc,
        ...buildListItems(data, pick(key, schema), indexPatterns),
      ],
      []
    );
    return (
      <EuiFlexGroup gutterSize="none" direction="row" justifyContent="spaceAround">
        {chunk(Math.ceil(listItems.length / 2), listItems).map((chunckListItems, index) => (
          <EuiFlexItemWidth key={`description-step-rule-${index}`} grow={false}>
            <EuiDescriptionList listItems={chunckListItems} />
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
  if (field === 'useIndicesConfig') {
    return [];
  } else if (field === 'queryBar' && indexPatterns != null) {
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
  } else if (field === 'threats') {
    const threats: IMitreEnterpriseAttack[] = get(field, value).filter(
      (threat: IMitreEnterpriseAttack) => threat.tactic.name !== 'none'
    );
    if (threats.length > 0) {
      return [
        {
          title: label,
          description: (
            <ThreatsEuiFlexGroup direction="column">
              {threats.map((threat, index) => {
                const tactic = tacticsOptions.find(t => t.name === threat.tactic.name);
                return (
                  <EuiFlexItem key={`${threat.tactic.name}-${index}`}>
                    <EuiText grow={false} size="s">
                      <h5>
                        <EuiLink href={threat.tactic.reference} target="_blank">
                          {tactic != null ? tactic.text : ''}
                        </EuiLink>
                      </h5>
                      <MyEuiListGroup
                        flush={false}
                        bordered={false}
                        listItems={threat.techniques.map(technique => {
                          const myTechnique = techniquesOptions.find(
                            t => t.name === technique.name
                          );
                          return {
                            label: myTechnique != null ? myTechnique.label : '',
                            href: technique.reference,
                            target: '_blank',
                          };
                        })}
                      />
                    </EuiText>
                  </EuiFlexItem>
                );
              })}
            </ThreatsEuiFlexGroup>
          ),
        },
      ];
    }
    return [];
  } else if (field === 'description') {
    return [
      {
        title: label,
        description: <EuiTextArea value={get(field, value)} readOnly={true} />,
      },
    ];
  } else if (Array.isArray(get(field, value))) {
    const values: string[] = get(field, value);
    if (!isEmpty(values) && values.filter(val => !isEmpty(val)).length > 0) {
      return [
        {
          title: label,
          description: (
            <EuiFlexGroup responsive={false} gutterSize="xs">
              {values.map((val: string) =>
                isEmpty(val) ? null : (
                  <EuiFlexItem grow={false} key={`${field}-${val}`}>
                    <EuiBadgeWrap color="hollow">{val}</EuiBadgeWrap>
                  </EuiFlexItem>
                )
              )}
            </EuiFlexGroup>
          ),
        },
      ];
    }
    return [];
  }
  return [
    {
      title: label,
      description: get(field, value),
    },
  ];
};
