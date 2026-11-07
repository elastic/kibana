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
import { KibanaServices, useCasesConfig } from '../../common/lib/kibana';
import { CaseScope } from './metrics/case_scope';
import { CasesPageBody } from '../app/cases_page_body';
import { CaseDetailsAppHeader } from './components/case_details_header';
import { CaseViewTabContent } from './components/case_view_tab_content';
import { CaseDetailsTour } from './tour/case_details_tour';
import { useCaseRefreshRef } from './hooks/use_case_refresh_ref';
import { useCaseDataWithVisibleConversations } from '../attachments/conversation/use_visible_conversations';
import { RoomFlyout } from './components/room/room_flyout';
import { useIsRoomAvailable } from './components/room/use_room_availability';

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
  const visibleCaseData = useCaseDataWithVisibleConversations(caseData);
  const isRoomAvailable = useIsRoomAvailable();
  const { agenticEnabled } = useCasesConfig();

  return (
    <>
      <CaseDetailsAppHeader
        caseData={caseData}
        onUpdateField={onUpdateField}
        showMetrics={showMetrics}
        onShowMetricsChange={setShowMetrics}
      />
      <CasesPageBody>
        {/* With agentic cases on, Scope (impacted, indicators, activity) takes the metrics' place. */}
        {showMetrics &&
          (agenticEnabled ? (
            <CaseScope caseData={visibleCaseData} />
          ) : (
            <CaseViewMetrics data-test-subj="case-view-metrics" caseId={caseData.id} />
          ))}
        <EuiSpacer size="l" />
        {KibanaServices.getConfig()?.attachments?.enabled === true && (
          <LensAttachReturnConsumer caseId={caseData.id} />
        )}
        <CaseViewTabContent
          caseData={visibleCaseData}
          searchTerm={searchTerm}
          onSearch={onSearch}
          onUpdateField={onUpdateField}
        />
      </CasesPageBody>
      <CaseDetailsTour caseData={caseData} />
      {isRoomAvailable ? (
        <RoomFlyout caseData={visibleCaseData} onUpdateField={onUpdateField} hasAgentBuilder />
      ) : null}
    </>
  );
});
CaseViewPage.displayName = 'CaseViewPage';
