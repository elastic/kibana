/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionForm } from '../../../../../../../plugins/triggers_actions_ui/public';
import {
  AlertAction,
  Alert,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../../plugins/triggers_actions_ui/public/types';
import * as i18nCommon from '../../common/translations';
import { EmptyPage } from '../../../components/empty_page';
import { useKibana } from '../../../lib/kibana';

const OverviewEmptyComponent: React.FC = () => {
  const actionTypes = [
    { id: '.email', name: 'Email', enabled: true },
    { id: '.index', name: 'Index', enabled: true },
    { id: '.pagerduty', name: 'PagerDuty', enabled: true },
    { id: '.server-log', name: 'Server log', enabled: true },
    { id: '.servicenow', name: 'servicenow', enabled: true },
    { id: '.slack', name: 'Slack', enabled: true },
    { id: '.webhook', name: 'Webhook', enabled: true },
    { id: '.example-action', name: 'Example Action', enabled: true },
  ];
  const { http, docLinks, triggers_actions_ui } = useKibana().services;
  const basePath = http.basePath.get();
  const actionTypeRegistry = triggers_actions_ui.actionTypeRegistry;
  const [alert, setAlert] = useState<Alert>(({
    params: {},
    consumer: 'siem',
    alertTypeId: '.siem',
    schedule: {
      interval: '1m',
    },
    actions: [],
    tags: [],
  } as unknown) as Alert);

  return (
    <>
      <EmptyPage
        actionPrimaryIcon="gear"
        actionPrimaryLabel={i18nCommon.EMPTY_ACTION_PRIMARY}
        actionPrimaryUrl={`${basePath}/app/kibana#/home/tutorial_directory/siem`}
        actionSecondaryIcon="popout"
        actionSecondaryLabel={i18nCommon.EMPTY_ACTION_SECONDARY}
        actionSecondaryTarget="_blank"
        actionSecondaryUrl={docLinks.links.siem.gettingStarted}
        data-test-subj="empty-page"
        message={i18nCommon.EMPTY_MESSAGE}
        title={i18nCommon.EMPTY_TITLE}
      />
      <EuiSpacer size="xl" />
      <ActionForm
        actions={alert.actions}
        messageVariables={['test var1', 'test var2']}
        defaultActionGroupId={'default'}
        setActionIdByIndex={(id: string, index: number) => {
          alert.actions[index].id = id;
        }}
        setAlertProperty={(updatedActions: AlertAction[]) => {
          setAlert({ ...alert, actions: updatedActions });
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setActionParamsProperty={(key: string, value: any, index: number) =>
          (alert.actions[index] = { ...alert.actions[index], [key]: value })
        }
        http={http}
        actionTypeRegistry={actionTypeRegistry}
        actionTypes={actionTypes}
        defaultActionMessage={'Alert [{{ctx.metadata.name}}] has exceeded the threshold'}
      />
    </>
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
