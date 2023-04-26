/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { getPatternIlmPhaseDescription } from '../../helpers';
import type { IlmExplainPhaseCounts, IlmPhase } from '../../types';

const PhaseCountsFlexGroup = styled(EuiFlexGroup)`
  display: inline-flex;
  gap: ${({ theme }) => theme.eui.euiSizeS};
`;

export const phases: IlmPhase[] = ['hot', 'unmanaged', 'warm', 'cold', 'frozen'];

interface Props {
  ilmExplainPhaseCounts: IlmExplainPhaseCounts;
  pattern: string;
}

const IlmPhaseCountsComponent: React.FC<Props> = ({ ilmExplainPhaseCounts, pattern }) => (
  <PhaseCountsFlexGroup data-test-subj="ilmPhaseCounts" gutterSize="none">
    {phases.map((phase) =>
      ilmExplainPhaseCounts[phase] != null && ilmExplainPhaseCounts[phase] > 0 ? (
        <EuiFlexItem key={phase} grow={false}>
          <EuiToolTip
            content={getPatternIlmPhaseDescription({
              indices: ilmExplainPhaseCounts[phase],
              pattern,
              phase,
            })}
          >
            <EuiBadge color="hollow">{`${phase} (${ilmExplainPhaseCounts[phase]})`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null
    )}
  </PhaseCountsFlexGroup>
);

IlmPhaseCountsComponent.displayName = 'IlmPhaseCountsComponent';

export const IlmPhaseCounts = React.memo(IlmPhaseCountsComponent);
