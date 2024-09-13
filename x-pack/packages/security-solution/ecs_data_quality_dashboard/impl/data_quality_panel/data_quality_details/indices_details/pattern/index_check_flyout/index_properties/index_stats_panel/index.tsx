/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { DOCS, ILM_PHASE, SIZE } from '../../../../../../translations';
import { Stat } from '../../../../../../stat';
import { getIlmPhaseDescription } from '../../../../../../utils/get_ilm_phase_description';

const StyledFlexItem = styled(EuiFlexItem)`
  border-right: 1px solid ${({ theme }) => theme.eui.euiBorderColor};
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};

  &:last-child {
    border-right: none;
  }

  strong {
    text-transform: capitalize;
  }
`;

export interface Props {
  docsCount: string;
  ilmPhase: string;
  sizeInBytes: string;
}

export const IndexStatsPanelComponent: React.FC<Props> = ({ docsCount, ilmPhase, sizeInBytes }) => (
  <EuiPanel data-test-subj="indexStatsPanel" paddingSize="s" hasShadow={false} hasBorder={true}>
    <EuiFlexGroup gutterSize="m">
      <StyledFlexItem>
        <strong>{DOCS}</strong>
        <EuiSpacer />
        {docsCount}
      </StyledFlexItem>
      <StyledFlexItem>
        <div>
          <strong>{ILM_PHASE}</strong>
          <EuiSpacer />
          <Stat
            badgeText={ilmPhase}
            tooltipText={getIlmPhaseDescription(ilmPhase)}
            badgeProps={{ 'data-test-subj': 'ilmPhase' }}
          />
        </div>
      </StyledFlexItem>
      <StyledFlexItem>
        <strong>{SIZE}</strong>
        <EuiSpacer />
        {sizeInBytes}
      </StyledFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

IndexStatsPanelComponent.displayName = 'IndexStatsPanelComponent';

export const IndexStatsPanel = React.memo(IndexStatsPanelComponent);
