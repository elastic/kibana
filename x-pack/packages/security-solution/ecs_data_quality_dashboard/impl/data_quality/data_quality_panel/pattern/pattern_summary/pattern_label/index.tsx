/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiToolTip, EuiIcon } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { getResultToolTip, showResult } from './helpers';
import { IlmPhaseCounts } from '../../../ilm_phase_counts';
import { getResultIcon, getResultIconColor } from '../../../summary_table/helpers';
import * as i18n from '../translations';
import type { IlmExplainPhaseCounts } from '../../../../types';

const ResultContainer = styled.div`
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
`;

interface Props {
  incompatible: number | undefined;
  indices: number | undefined;
  indicesChecked: number | undefined;
  ilmExplainPhaseCounts: IlmExplainPhaseCounts | undefined;
  pattern: string;
}

const PatternLabelComponent: React.FC<Props> = ({
  ilmExplainPhaseCounts,
  incompatible,
  indices,
  indicesChecked,
  pattern,
}) => (
  <>
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <ResultContainer>
          {showResult({
            incompatible,
            indices,
            indicesChecked,
          }) && (
            <EuiToolTip content={getResultToolTip(incompatible)}>
              <EuiIcon
                color={getResultIconColor(incompatible)}
                type={getResultIcon(incompatible)}
              />
            </EuiToolTip>
          )}
        </ResultContainer>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.PATTERN_OR_INDEX_TOOLTIP}>
          <EuiTitle size="s">
            <h4>{pattern}</h4>
          </EuiTitle>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>

    <EuiSpacer size="xs" />
    {ilmExplainPhaseCounts && (
      <IlmPhaseCounts ilmExplainPhaseCounts={ilmExplainPhaseCounts} pattern={pattern} />
    )}
  </>
);

PatternLabelComponent.displayName = 'PatternLabelComponent';

export const PatternLabel = React.memo(PatternLabelComponent);
