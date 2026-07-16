/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useCasesTitleBreadcrumbs } from '../../use_breadcrumbs';
import { CaseViewMetrics } from '../../case_view/metrics';
import type { CaseViewPageProps } from '../../case_view/types';

import { useOnUpdateField } from '../../case_view/use_on_update_field';
import { LensAttachReturnConsumer } from '../../attachments/lens/lens_return/lens_attach_return_consumer';
import { KibanaServices } from '../../../common/lib/kibana';
import { CasesPageBody } from '../../app/cases_page_body';
import { CaseDetailsAppHeader } from './components/case_details_header';
import { CaseViewTabContent } from './components/case_view_tab_content';
import { useCaseRefreshRef } from './hooks/use_case_refresh_ref';

export type CaseViewPageRedesignProps = Omit<CaseViewPageProps, 'fetchCase'>;

export const CaseViewPageRedesign = React.memo<CaseViewPageRedesignProps>(
  ({ caseData, refreshRef }) => {
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
      <>
        <CaseDetailsAppHeader
          caseData={caseData}
          onUpdateField={onUpdateField}
          showMetrics={showMetrics}
          onShowMetricsChange={setShowMetrics}
        />
        <CasesPageBody>
          {showMetrics && (
            <CaseViewMetrics data-test-subj="case-view-metrics" caseId={caseData.id} />
          )}
          <EuiSpacer size="l" />
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
      </>
    );
  }
);
CaseViewPageRedesign.displayName = 'CaseViewPageRedesign';
