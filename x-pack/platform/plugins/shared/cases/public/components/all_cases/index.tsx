/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiNotificationBadge, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { CasesDeepLinkId } from '../../common/navigation';
import { CaseCallouts } from '../callouts/case_callouts';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import { CasesPageBody } from '../app/cases_page_body';
import { AllCasesList } from './all_cases_list';
import { CasesListAppHeader } from './components/cases_list_app_header';
import { Inbox } from '../inbox/inbox';
import { useInbox } from '../../containers/inbox/hooks';
import * as inboxI18n from '../inbox/translations';

type AllCasesTab = 'cases' | 'inbox';

export const AllCases: React.FC = () => {
  useCasesBreadcrumbs(CasesDeepLinkId.cases);
  const [selectedTab, setSelectedTab] = useState<AllCasesTab>('cases');
  const { unreadCount } = useInbox();

  return (
    <>
      <CasesListAppHeader />
      <CasesPageBody>
        <CaseCallouts />
        <EuiTabs size="s" data-test-subj="all-cases-tabs">
          <EuiTab
            isSelected={selectedTab === 'cases'}
            onClick={() => setSelectedTab('cases')}
            data-test-subj="all-cases-tab-cases"
          >
            {inboxI18n.CASES_TAB}
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === 'inbox'}
            onClick={() => setSelectedTab('inbox')}
            append={
              unreadCount > 0 ? (
                <EuiNotificationBadge aria-label={inboxI18n.getUnreadCount(unreadCount)}>
                  {unreadCount}
                </EuiNotificationBadge>
              ) : undefined
            }
            data-test-subj="all-cases-tab-inbox"
          >
            {inboxI18n.INBOX_TAB}
          </EuiTab>
        </EuiTabs>
        <EuiSpacer size="m" />
        {selectedTab === 'cases' ? <AllCasesList /> : <Inbox />}
      </CasesPageBody>
    </>
  );
};
AllCases.displayName = 'AllCases';

// eslint-disable-next-line import/no-default-export
export { AllCases as default };
