/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiText,
  EuiListGroup,
} from '@elastic/eui';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { esFilters } from '../../../../../../../../../../src/plugins/data/public';

import { tacticsOptions, techniquesOptions } from '../../../mitre/mitre_tactics_techniques';

import { FilterLabel } from './filter_label';
import * as i18n from './translations';
import { BuildQueryBarDescription, BuildThreatsDescription, ListItems } from './types';

const EuiBadgeWrap = styled(EuiBadge)`
  .euiBadge__text {
    white-space: pre-wrap !important;
  }
`;

export const buildQueryBarDescription = ({
  field,
  filters,
  filterManager,
  query,
  savedId,
  indexPatterns,
}: BuildQueryBarDescription): ListItems[] => {
  let items: ListItems[] = [];
  if (!isEmpty(filters)) {
    filterManager.setFilters(filters);
    items = [
      ...items,
      {
        title: <>{i18n.FILTERS_LABEL} </>,
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
        title: <>{i18n.QUERY_LABEL} </>,
        description: <>{query.query} </>,
      },
    ];
  }
  if (!isEmpty(savedId)) {
    items = [
      ...items,
      {
        title: <>{i18n.SAVED_ID_LABEL} </>,
        description: <>{savedId} </>,
      },
    ];
  }
  return items;
};

const ThreatsEuiFlexGroup = styled(EuiFlexGroup)`
  .euiFlexItem {
    margin-bottom: 0px;
  }
`;

const MyEuiListGroup = styled(EuiListGroup)`
  padding: 0px;
  .euiListGroupItem__button {
    padding: 0px;
  }
`;

export const buildThreatsDescription = ({
  label,
  threats,
}: BuildThreatsDescription): ListItems[] => {
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
                        const myTechnique = techniquesOptions.find(t => t.name === technique.name);
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
};

export const buildStringArrayDescription = (
  label: string,
  field: string,
  values: string[]
): ListItems[] => {
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
};

export const buildSeverityDescription = (label: string, value: string): ListItems[] => {
  return [
    {
      title: label,
      description: (
        <EuiHealth
          color={
            value === 'low'
              ? euiLightVars.euiColorVis0
              : value === 'medium'
              ? euiLightVars.euiColorVis5
              : value === 'high'
              ? euiLightVars.euiColorVis7
              : euiLightVars.euiColorVis9
          }
        >
          {value}
        </EuiHealth>
      ),
    },
  ];
};

export const buildUrlsDescription = (label: string, values: string[]): ListItems[] => {
  if (!isEmpty(values) && values.filter(val => !isEmpty(val)).length > 0) {
    return [
      {
        title: label,
        description: (
          <EuiListGroup
            flush={true}
            bordered={false}
            listItems={values.map((val: string) => ({
              label: val,
              href: val,
              iconType: 'link',
              size: 'xs',
              target: '_blank',
            }))}
          />
        ),
      },
    ];
  }
  return [];
};
