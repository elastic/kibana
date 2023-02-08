/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { EMPTY_STAT, getIncompatibleStatColor } from '../../../../helpers';
import { StatLabel } from '../../../stat_label';
import * as i18n from '../../../stat_label/translations';

const StatsFlexGroup = styled(EuiFlexGroup)`
  gap: ${({ theme }) => theme.eui.euiSizeS};
`;

const IndicesStatContainer = styled.div`
  min-width: 100px;
`;

const DocsContainer = styled.div`
  min-width: 155px;
`;

const STAT_TITLE_SIZE = 's';

interface Props {
  defaultNumberFormat: string;
  docsCount: number | undefined;
  incompatible: number | undefined;
  indices: number | undefined;
  indicesChecked: number | undefined;
  pattern?: string;
}

const StatsRollupComponent: React.FC<Props> = ({
  defaultNumberFormat,
  docsCount,
  incompatible,
  indices,
  indicesChecked,
  pattern,
}) => {
  const incompatibleDescription = useMemo(
    () => <StatLabel line1={i18n.INCOMPATIBLE} line2={i18n.FIELDS} />,
    []
  );
  const indicesCheckedDescription = useMemo(
    () => <StatLabel line1={i18n.INDICES} line2={i18n.CHECKED} />,
    []
  );
  const docsDescription = useMemo(() => <StatLabel line2={i18n.DOCS} />, []);
  const indicesDescription = useMemo(() => <StatLabel line2={i18n.INDICES} />, []);

  return (
    <StatsFlexGroup alignItems="flexEnd" gutterSize="none" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            pattern != null
              ? i18n.INCOMPATIBLE_PATTERN_TOOL_TIP(pattern)
              : i18n.TOTAL_INCOMPATIBLE_TOOL_TIP
          }
        >
          <EuiStat
            description={incompatibleDescription}
            title={
              incompatible != null ? numeral(incompatible).format(defaultNumberFormat) : EMPTY_STAT
            }
            titleColor={getIncompatibleStatColor(incompatible)}
            titleSize={STAT_TITLE_SIZE}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <IndicesStatContainer>
          <EuiToolTip
            content={
              pattern != null
                ? i18n.TOTAL_COUNT_OF_INDICES_CHECKED_MATCHING_PATTERN_TOOL_TIP(pattern)
                : i18n.TOTAL_INDICES_CHECKED_TOOL_TIP
            }
          >
            <EuiStat
              description={indicesCheckedDescription}
              title={
                indicesChecked != null
                  ? numeral(indicesChecked).format(defaultNumberFormat)
                  : EMPTY_STAT
              }
              titleSize={STAT_TITLE_SIZE}
            />
          </EuiToolTip>
        </IndicesStatContainer>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <IndicesStatContainer>
          <EuiToolTip
            content={
              pattern != null
                ? i18n.TOTAL_COUNT_OF_INDICES_MATCHING_PATTERN_TOOL_TIP(pattern)
                : i18n.TOTAL_INDICES_TOOL_TIP
            }
          >
            <EuiStat
              description={indicesDescription}
              title={indices != null ? numeral(indices).format(defaultNumberFormat) : 0}
              titleSize={STAT_TITLE_SIZE}
            />
          </EuiToolTip>
        </IndicesStatContainer>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <DocsContainer>
          <EuiToolTip
            content={
              pattern != null ? i18n.INDEX_DOCS_PATTERN_TOOL_TIP(pattern) : i18n.TOTAL_DOCS_TOOL_TIP
            }
          >
            <EuiStat
              description={docsDescription}
              title={
                docsCount != null ? numeral(docsCount).format(defaultNumberFormat) : EMPTY_STAT
              }
              titleSize={STAT_TITLE_SIZE}
            />
          </EuiToolTip>
        </DocsContainer>
      </EuiFlexItem>
    </StatsFlexGroup>
  );
};

StatsRollupComponent.displayName = 'StatsRollupComponent';

export const StatsRollup = React.memo(StatsRollupComponent);
