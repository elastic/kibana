/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { BASE_PATH, Section } from '../../../np_ready/public/application/constants';
import { useAppDependencies } from './index';
import { breadcrumbService } from './lib/breadcrumb';
import { docTitleService } from './lib/doc_title';

import { ActionsList } from './sections/actions_list/components/actions_list';
import { AlertsList } from './sections/alerts_list/components/alerts_list';

interface MatchParams {
  section: Section;
}

export const AlertsUIHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const {
    core: { chrome },
  } = useAppDependencies();

  const notificationsUiEnabled = chrome.getIsVisible$();

  const tabs: Array<{
    id: Section;
    name: React.ReactNode;
  }> = [
    {
      id: 'alerts',
      name: (
        <FormattedMessage id="xpack.alertingUI.home.snapshotsTabTitle" defaultMessage="Alerts" />
      ),
    },
    {
      id: 'actions',
      name: (
        <FormattedMessage
          id="xpack.alertingUI.home.repositoriesTabTitle"
          defaultMessage="Actions"
        />
      ),
    },
    {
      id: 'activity_logs',
      name: (
        <FormattedMessage
          id="xpack.alertingUI.home.restoreTabTitle"
          defaultMessage="Activity Log"
        />
      ),
    },
  ];

  // Just example of Enable/Disable some UI tabs
  if (notificationsUiEnabled) {
    tabs.splice(2, 0, {
      id: 'notifications',
      name: (
        <FormattedMessage id="xpack.alertingUI.home.policiesTabTitle" defaultMessage="Policies" />
      ),
    });
  }

  const onSectionChange = (newSection: Section) => {
    history.push(`${BASE_PATH}/${newSection}`);
  };

  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(section || 'home');
    docTitleService.setTitle(section || 'home');
  }, [section]);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTabs>
          {tabs.map(tab => (
            <EuiTab
              onClick={() => onSectionChange(tab.id)}
              isSelected={tab.id === section}
              key={tab.id}
              data-test-subj="tab"
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer size="s" />

        <Switch>
          <Route exact path={`${BASE_PATH}/actions`} component={ActionsList} />
          <Route exact path={`${BASE_PATH}/alerts`} component={AlertsList} />
          <Route exact path={`${BASE_PATH}/notifications`} />
          <Route exact path={`${BASE_PATH}/activitylog`} />
        </Switch>
      </EuiPageContent>
    </EuiPageBody>
  );
};
