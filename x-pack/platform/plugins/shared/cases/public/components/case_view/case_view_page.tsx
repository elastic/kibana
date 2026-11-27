/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useCasesTitleBreadcrumbs } from '../use_breadcrumbs';
import { CaseViewMetrics } from './metrics';
import type { CaseViewPageProps } from './types';

import { useOnUpdateField } from './use_on_update_field';
import { LensAttachReturnConsumer } from '../attachments/lens/lens_return/lens_attach_return_consumer';
import { KibanaServices } from '../../common/lib/kibana';
import { CasesPageBody } from '../app/cases_page_body';
import { CaseDetailsAppHeader } from './components/case_details_header';
import { CaseViewTabContent } from './components/case_view_tab_content';
import { WhatsNewPanel } from './components/whats_new/whats_new_panel';
import { JumpToNewActivityProvider } from './components/whats_new/jump_to_new_activity_context';
import { CaseDetailsTour } from './tour/case_details_tour';
import { useCaseRefreshRef } from './hooks/use_case_refresh_ref';

export type CaseViewPageComponentProps = Omit<CaseViewPageProps, 'fetchCase'>;

export const CaseViewPage = React.memo<CaseViewPageComponentProps>(({ caseData, refreshRef }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showMetrics, setShowMetrics] = useState(true);

  const onSearch = useCallback(
    (newSearch: string) => {
      setSearchTerm(newSearch.trim());
    },
    [setSearchTerm]
  );

  useCasesTitleBreadcrumbs(caseData.title);

  const { onUpdateField, isLoading } = useOnUpdateField({ caseData });
  useCaseRefreshRef({ refreshRef, isLoading });

  return (
    <JumpToNewActivityProvider>
      <CaseDetailsAppHeader
        caseData={caseData}
        onUpdateField={onUpdateField}
        showMetrics={showMetrics}
        onShowMetricsChange={setShowMetrics}
      />
      <CasesPageBody>
        {showMetrics && <CaseViewMetrics data-test-subj="case-view-metrics" caseId={caseData.id} />}
        <EuiSpacer size="l" />
        <WhatsNewPanel caseId={caseData.id} />
        {KibanaServices.getConfig()?.attachments?.enabled === true && (
          <LensAttachReturnConsumer caseId={caseData.id} />
        )}
        <CaseViewTabContent
          caseData={caseData}
          searchTerm={searchTerm}
          onSearch={onSearch}
          onUpdateField={onUpdateField}
        />
      </CasesPageBody>
      <CaseDetailsTour caseData={caseData} />
    </JumpToNewActivityProvider>
  );
});
CaseViewPage.displayName = 'CaseViewPage';
