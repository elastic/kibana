/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiPanel, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { CaseUI } from '../../../common/ui/types';
import { CaseViewTabs } from '../case_view/case_view_tabs';
import type { CASE_VIEW_PAGE_TABS } from '../../../common/types';

interface PlaceHolderProps {
  caseData: CaseUI;
  activeTab: CASE_VIEW_PAGE_TABS;
  height?: number;
}

const panelCss = (height: number) => css`
  height: ${height}px;
`;

export const PlaceHolderTabContent: React.FC<PlaceHolderProps> = ({
  caseData,
  activeTab,
  height = 250,
}) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <CaseViewTabs caseData={caseData} activeTab={activeTab} />
        <EuiPanel color="primary" paddingSize="l" css={panelCss(height)} grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceAround" css={{ height: '100%' }}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="l">
                <h1>{'Solution tab placeholder'}</h1>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

PlaceHolderTabContent.displayName = 'PlaceHolderTabContent';
