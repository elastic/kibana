/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { EMPTY_STAT } from '../constants';
import { useDataQualityContext } from '../data_quality_context';
import * as i18n from '../stat_label/translations';
import { Stat } from '../stat';
import { getIncompatibleStatBadgeColor } from '../utils/get_incompatible_stat_badge_color';

const StyledStatWrapperFlexItem = styled(EuiFlexItem)`
  padding: 0 ${({ theme }) => theme.eui.euiSize};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  border-color: ${({ theme }) => theme.eui.euiBorderColor};

  &:last-child {
    padding-right: 0;
    border-right: none;
  }
  &:first-child {
    padding-left: 0;
  }
`;

interface Props {
  docsCount?: number;
  incompatible?: number;
  indices?: number;
  indicesChecked?: number;
  pattern?: string;
  sizeInBytes?: number;
}

const StatsRollupComponent: React.FC<Props> = ({
  docsCount,
  incompatible,
  indices,
  indicesChecked,
  pattern,
  sizeInBytes,
}) => {
  const { formatNumber, formatBytes } = useDataQualityContext();

  return (
    <EuiFlexGroup
      alignItems="flexEnd"
      data-test-subj="statsRollup"
      gutterSize="none"
      justifyContent="flexEnd"
    >
      <StyledStatWrapperFlexItem grow={false}>
        <Stat
          tooltipText={
            pattern != null
              ? i18n.TOTAL_INCOMPATIBLE_PATTERN_TOOL_TIP
              : i18n.TOTAL_INCOMPATIBLE_TOOL_TIP
          }
          badgeText={incompatible != null ? formatNumber(incompatible) : EMPTY_STAT}
          badgeColor={getIncompatibleStatBadgeColor(incompatible)}
        >
          {i18n.INCOMPATIBLE_FIELDS}
        </Stat>
      </StyledStatWrapperFlexItem>

      <StyledStatWrapperFlexItem grow={false}>
        <Stat
          tooltipText={
            pattern != null
              ? i18n.TOTAL_CHECKED_INDICES_PATTERN_TOOL_TIP
              : i18n.TOTAL_CHECKED_INDICES_TOOL_TIP
          }
          badgeText={indicesChecked != null ? formatNumber(indicesChecked) : EMPTY_STAT}
        >
          {i18n.INDICES_CHECKED}
        </Stat>
      </StyledStatWrapperFlexItem>

      <StyledStatWrapperFlexItem grow={false}>
        <Stat
          tooltipText={
            pattern != null ? i18n.TOTAL_INDICES_PATTERN_TOOL_TIP : i18n.TOTAL_INDICES_TOOL_TIP
          }
          badgeText={indices != null ? formatNumber(indices) : '0'}
        >
          {i18n.INDICES}
        </Stat>
      </StyledStatWrapperFlexItem>

      {sizeInBytes != null && (
        <StyledStatWrapperFlexItem grow={false}>
          <Stat
            tooltipText={
              pattern != null ? i18n.TOTAL_SIZE_PATTERN_TOOL_TIP : i18n.TOTAL_SIZE_TOOL_TIP
            }
            badgeText={sizeInBytes != null ? formatBytes(sizeInBytes) : EMPTY_STAT}
          >
            {i18n.SIZE}
          </Stat>
        </StyledStatWrapperFlexItem>
      )}

      <StyledStatWrapperFlexItem grow={false}>
        <Stat
          tooltipText={
            pattern != null ? i18n.TOTAL_DOCS_PATTERN_TOOL_TIP : i18n.TOTAL_DOCS_TOOL_TIP
          }
          badgeText={docsCount != null ? formatNumber(docsCount) : EMPTY_STAT}
        >
          {i18n.DOCS}
        </Stat>
      </StyledStatWrapperFlexItem>
    </EuiFlexGroup>
  );
};

StatsRollupComponent.displayName = 'StatsRollupComponent';

export const StatsRollup = React.memo(StatsRollupComponent);
