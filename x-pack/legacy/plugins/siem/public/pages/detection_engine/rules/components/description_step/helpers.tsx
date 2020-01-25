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
  EuiLink,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

import { isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { esFilters } from '../../../../../../../../../../src/plugins/data/public';

import { tacticsOptions, techniquesOptions } from '../../../mitre/mitre_tactics_techniques';

import { FilterLabel } from './filter_label';
import * as i18n from './translations';
import { BuildQueryBarDescription, BuildThreatDescription, ListItems } from './types';
import { SeverityBadge } from '../severity_badge';
import ListTreeIcon from './assets/list_tree_icon.svg';

const isNotEmptyArray = (values: string[]) =>
  !isEmpty(values) && values.filter(val => !isEmpty(val)).length > 0;

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

const ThreatEuiFlexGroup = styled(EuiFlexGroup)`
  .euiFlexItem {
    margin-bottom: 0px;
  }
`;

const TechniqueLinkItem = styled(EuiButtonEmpty)`
  .euiIcon {
    width: 8px;
    height: 8px;
  }
`;

const ReferenceLinkItem = styled(EuiButtonEmpty)`
  .euiIcon {
    width: 12px;
    height: 12px;
  }
`;

export const buildThreatDescription = ({ label, threat }: BuildThreatDescription): ListItems[] => {
  if (threat.length > 0) {
    return [
      {
        title: label,
        description: (
          <ThreatEuiFlexGroup direction="column">
            {threat.map((singleThreat, index) => {
              const tactic = tacticsOptions.find(t => t.id === singleThreat.tactic.id);
              return (
                <EuiFlexItem key={`${singleThreat.tactic.name}-${index}`}>
                  <EuiLink href={singleThreat.tactic.reference} target="_blank">
                    {tactic != null ? tactic.text : ''}
                  </EuiLink>
                  <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
                    {singleThreat.technique.map(technique => {
                      const myTechnique = techniquesOptions.find(t => t.id === technique.id);
                      return (
                        <EuiFlexItem>
                          <TechniqueLinkItem
                            href={technique.reference}
                            target="_blank"
                            iconType={ListTreeIcon}
                            size="xs"
                            flush="left"
                          >
                            {myTechnique != null ? myTechnique.label : ''}
                          </TechniqueLinkItem>
                        </EuiFlexItem>
                      );
                    })}
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
            <EuiSpacer />
          </ThreatEuiFlexGroup>
        ),
      },
    ];
  }
  return [];
};

export const buildUnorderedListArrayDescription = (
  label: string,
  field: string,
  values: string[]
): ListItems[] => {
  if (isNotEmptyArray(values)) {
    return [
      {
        title: label,
        description: (
          <ul>
            {values.map((val: string) =>
              isEmpty(val) ? null : <li key={`${field}-${val}`}>{val}</li>
            )}
          </ul>
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
  if (isNotEmptyArray(values)) {
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

export const buildSeverityDescription = (label: string, value: string): ListItems[] => [
  {
    title: label,
    description: <SeverityBadge value={value} />,
  },
];

export const buildUrlsDescription = (label: string, values: string[]): ListItems[] => {
  if (isNotEmptyArray(values)) {
    return [
      {
        title: label,
        description: (
          <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
            {values.map((val: string) => (
              <EuiFlexItem>
                <ReferenceLinkItem
                  href={val}
                  target="_blank"
                  iconType="link"
                  size="xs"
                  flush="left"
                >
                  {val}
                </ReferenceLinkItem>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
    ];
  }
  return [];
};
