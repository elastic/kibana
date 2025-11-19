/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { CaseUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseViewTabs } from '../case_view_tabs';

export const CaseViewAttachments = ({ caseData }: { caseData: CaseUI }) => {
  return (
    <>
      <EuiFlexItem
        grow={6}
        css={css`
          max-width: 75%;
        `}
      >
        <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.ATTACHMENTS} />
        <EuiSpacer size="l" />
        <EuiFlexGroup direction="column" responsive={false} data-test-subj="case-view-attachments">
          <EuiFlexItem>{`todo`}</EuiFlexItem>
          <EuiFlexItem>{`todo`}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
};
CaseViewAttachments.displayName = 'CaseViewAttachments';
