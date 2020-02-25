/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiBadge,
  EuiInMemoryTable,
  EuiSpacer,
  EuiButton,
  EuiIcon,
  EuiEmptyPrompt,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import {
  ActionsConnectorsContextProvider,
  ConnectorAddFlyout,
} from '../../../../../../../plugins/triggers_actions_ui/public';
import * as i18nCommon from '../../common/translations';
import { EmptyPage } from '../../../components/empty_page';
import { useKibana } from '../../../lib/kibana';

const OverviewEmptyComponent: React.FC = () => {
  const { http, docLinks, triggers_actions_ui, notifications, application } = useKibana().services;
  const basePath = http.basePath.get();
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);

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
      <EuiButton
        data-test-subj="createFirstActionButton"
        key="create-action"
        fill
        iconType="plusInCircle"
        iconSide="left"
        onClick={() => setAddFlyoutVisibility(true)}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.actionsConnectorsList.addActionButtonLabel"
          defaultMessage="Create connector"
        />
      </EuiButton>
      <ActionsConnectorsContextProvider
        value={{
          http,
          actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
          toastNotifications: notifications.toasts,
          capabilities: application.capabilities,
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={addFlyoutVisible}
          setAddFlyoutVisibility={setAddFlyoutVisibility}
        />
      </ActionsConnectorsContextProvider>
    </>
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
