/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiDescriptionList,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiTextArea,
  EuiLink,
  EuiText,
  EuiListGroup,
} from '@elastic/eui';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { isEmpty, chunk, get, pick } from 'lodash/fp';
import React, { memo, ReactNode, useState } from 'react';
import styled from 'styled-components';

import {
  IIndexPattern,
  esFilters,
  FilterManager,
  Query,
} from '../../../../../../../../../../src/plugins/data/public';
import { useKibana } from '../../../../../lib/kibana';
import { FilterLabel } from './filter_label';
import { FormSchema } from '../shared_imports';
import * as I18n from './translations';

import { IMitreEnterpriseAttack } from '../../types';
import { tacticsOptions, techniquesOptions } from '../../../mitre/mitre_tactics_techniques';

interface StepRuleDescriptionProps {
  direction?: 'row' | 'column';
  data: unknown;
  indexPatterns?: IIndexPattern;
  schema: FormSchema;
}

const EuiBadgeWrap = styled(EuiBadge)`
  .euiBadge__text {
    white-space: pre-wrap !important;
  }
`;

const EuiFlexItemWidth = styled(EuiFlexItem)<{ direction: string }>`
  ${props => (props.direction === 'row' ? 'width : 50%;' : 'width: 100%;')};
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

const MyEuiTextArea = styled(EuiTextArea)`
  max-width: 100%;
  height: 80px;
`;

export const StepRuleDescription = memo<StepRuleDescriptionProps>(
  ({ data, direction = 'row', indexPatterns, schema }) => {
    const kibana = useKibana();
    const [filterManager] = useState<FilterManager>(new FilterManager(kibana.services.uiSettings));

    const keys = Object.keys(schema);
    const listItems = keys.reduce(
      (acc: ListItems[], key: string) => [
        ...acc,
        ...buildListItems(data, pick(key, schema), filterManager, indexPatterns),
      ],
      []
    );
    return (
      <EuiFlexGroup gutterSize="s" direction={direction} justifyContent="spaceAround">
        {chunk(Math.ceil(listItems.length / 2), listItems).map((chunckListItems, index) => (
          <EuiFlexItemWidth
            direction={direction}
            key={`description-step-rule-${index}`}
            grow={false}
          >
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
  filterManager: FilterManager,
  indexPatterns?: IIndexPattern
): ListItems[] =>
  Object.keys(schema).reduce<ListItems[]>(
    (acc, field) => [
      ...acc,
      ...getDescriptionItem(
        field,
        get([field, 'label'], schema),
        data,
        filterManager,
        indexPatterns
      ),
    ],
    []
  );

const getDescriptionItem = (
  field: string,
  label: string,
  value: unknown,
  filterManager: FilterManager,
  indexPatterns?: IIndexPattern
): ListItems[] => {
  if (field === 'useIndicesConfig') {
    return [];
  } else if (field === 'queryBar') {
    const filters = get('queryBar.filters', value) as esFilters.Filter[];
    const query = get('queryBar.query', value) as Query;
    const savedId = get('queryBar.saved_id', value);
    let items: ListItems[] = [];
    if (!isEmpty(filters)) {
      filterManager.setFilters(filters);
      items = [
        ...items,
        {
          title: <>{I18n.FILTERS_LABEL}</>,
          description: (
            <EuiFlexGroup wrap responsive={false} gutterSize="xs">
              {filterManager.getFilters().map((filter, index) => (
                <EuiFlexItem grow={false} key={`${field}-filter-${index}`}>
                  <EuiBadgeWrap color="hollow">
                    {indexPatterns != null ? (
                      <FilterLabel
                        filter={filter}
                        valueLabel={esFilters.getDisplayValueFromFilter(filter, [indexPatterns])}
                      />
                    ) : (
                      <EuiLoadingSpinner size="m" />
                    )}
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
        description: <MyEuiTextArea value={get(field, value)} readOnly={true} />,
      },
    ];
  } else if (Array.isArray(get(field, value))) {
    const values: string[] = get(field, value);
    if (!isEmpty(values) && values.filter(val => !isEmpty(val)).length > 0) {
      return [
        {
          title: label,
          description: (
            <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
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
  } else if (field === 'severity') {
    const val: string = get(field, value);
    return [
      {
        title: label,
        description: (
          <EuiHealth
            color={
              val === 'low'
                ? euiLightVars.euiColorVis0
                : val === 'medium'
                ? euiLightVars.euiColorVis5
                : val === 'high'
                ? euiLightVars.euiColorVis7
                : euiLightVars.euiColorVis9
            }
          >
            {val}
          </EuiHealth>
        ),
      },
    ];
  }
  const description: string = get(field, value);
  if (!isEmpty(description)) {
    return [
      {
        title: label,
        description,
      },
    ];
  }
  return [];
};
