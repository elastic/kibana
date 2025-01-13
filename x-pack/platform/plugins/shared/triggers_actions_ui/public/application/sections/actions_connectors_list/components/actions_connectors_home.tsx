/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { useLocation, matchPath } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiPageTemplate, EuiSpacer, EuiPageHeader, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { routeToConnectorEdit, routeToConnectors, routeToLogs, Section } from '../../../constants';
import { getAlertingSectionBreadcrumb } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import { suspendedComponentWithProps } from '../../../lib/suspended_component_with_props';
import { HealthContextProvider } from '../../../context/health_context';
import { HealthCheck } from '../../../components/health_check';
import { useKibana } from '../../../../common/lib/kibana';
import ConnectorEventLogListTableWithApi from './actions_connectors_event_log_list_table';
import { ActionConnector, EditConnectorTabs } from '../../../../types';
import { CreateConnectorFlyout } from '../../action_connector_form/create_connector_flyout';
import { EditConnectorFlyout } from '../../action_connector_form/edit_connector_flyout';
import { EditConnectorProps } from './types';
import { loadAllActions } from '../../../lib/action_connector_api';

const ConnectorsList = lazy(() => import('./actions_connectors_list'));

export interface MatchParams {
  section: Section;
}

export const ActionsConnectorsHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const {
    chrome,
    setBreadcrumbs,
    docLinks,
    actionTypeRegistry,
    http,
    notifications: { toasts },
  } = useKibana().services;

  const location = useLocation();

  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const [editConnectorProps, setEditConnectorProps] = useState<EditConnectorProps>({});
  const [actions, setActions] = useState<ActionConnector[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState<boolean>(true);

  const editItem = useCallback(
    (actionConnector: ActionConnector, tab: EditConnectorTabs, isFix?: boolean) => {
      setEditConnectorProps({ initialConnector: actionConnector, tab, isFix: isFix ?? false });
    },
    [setEditConnectorProps]
  );

  const loadActions = useCallback(async () => {
    setIsLoadingActions(true);
    try {
      const actionsResponse = await loadAllActions({ http });
      setActions(actionsResponse);
    } catch (e) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.connector.home.unableToLoadActionsMessage',
          {
            defaultMessage: 'Unable to load connectors',
          }
        ),
      });
    } finally {
      setIsLoadingActions(false);
    }
  }, [http, toasts]);

  useEffect(() => {
    loadActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs: Array<{
    id: Section;
    name: React.ReactNode;
  }> = [];
  tabs.push({
    id: 'connectors',
    name: (
      <FormattedMessage
        id="xpack.triggersActionsUI.connectors.home.connectorsTabTitle"
        defaultMessage="Connectors"
      />
    ),
  });
  tabs.push({
    id: 'logs',
    name: (
      <FormattedMessage
        id="xpack.triggersActionsUI.connectors.home.logsTabTitle"
        defaultMessage="Logs"
      />
    ),
  });

  const onSectionChange = (newSection: Section) => {
    history.push(`/${newSection}`);
  };

  // Set breadcrumb and page title
  useEffect(() => {
    setBreadcrumbs([getAlertingSectionBreadcrumb(section || 'connectors')]);
    chrome.docTitle.change(getCurrentDocTitle(section || 'connectors'));
  }, [section, chrome, setBreadcrumbs]);

  const renderLogsList = useCallback(() => {
    return (
      <EuiPageTemplate.Section grow={false} paddingSize="none">
        {suspendedComponentWithProps(
          ConnectorEventLogListTableWithApi,
          'xl'
        )({
          refreshToken: 0,
          initialPageSize: 50,
          hasConnectorNames: true,
          hasAllSpaceSwitch: true,
        })}
      </EuiPageTemplate.Section>
    );
  }, []);

  const renderConnectorsList = () => {
    return suspendedComponentWithProps(
      ConnectorsList,
      'xl'
    )({
      setAddFlyoutVisibility,
      editItem,
      isLoadingActions,
      actions,
      loadActions,
      setActions,
    });
  };

  const createConnectorButton = (
    <EuiButton
      data-test-subj="createConnectorButton"
      fill
      iconType="plusInCircle"
      iconSide="left"
      onClick={() => setAddFlyoutVisibility(true)}
      isLoading={false}
    >
      {i18n.translate('xpack.triggersActionsUI.connectors.home.createConnector', {
        defaultMessage: 'Create connector',
      })}
    </EuiButton>
  );

  const documentationButton = (
    <EuiButtonEmpty
      data-test-subj="documentationButton"
      key="documentation-button"
      target="_blank"
      href={docLinks.links.alerting.actionTypes}
      iconType="help"
    >
      <FormattedMessage
        id="xpack.triggersActionsUI.connectors.home.documentationButtonLabel"
        defaultMessage="Documentation"
      />
    </EuiButtonEmpty>
  );

  let topRightSideButtons: React.ReactNode[] = [];

  if (
    matchPath(location.pathname, {
      path: routeToConnectors,
      exact: true,
    }) ||
    matchPath(location.pathname, { path: routeToConnectorEdit, exact: true })
  ) {
    topRightSideButtons = [createConnectorButton, documentationButton];
  } else if (matchPath(location.pathname, { path: routeToLogs, exact: true })) {
    topRightSideButtons = [documentationButton];
  }

  return (
    <>
      <EuiPageHeader
        bottomBorder
        paddingSize="none"
        pageTitle={i18n.translate('xpack.triggersActionsUI.connectors.home.appTitle', {
          defaultMessage: 'Connectors',
        })}
        description={i18n.translate('xpack.triggersActionsUI.connectors.home.description', {
          defaultMessage: 'Connect third-party software with your alerting data.',
        })}
        rightSideItems={topRightSideButtons}
        tabs={tabs.map((tab) => ({
          label: tab.name,
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === section,
          key: tab.id,
          'data-test-subj': `${tab.id}Tab`,
        }))}
      />

      <EuiSpacer size="l" />

      {addFlyoutVisible && (
        <CreateConnectorFlyout
          onClose={() => {
            setAddFlyoutVisibility(false);
          }}
          onTestConnector={(connector) => editItem(connector, EditConnectorTabs.Test)}
          onConnectorCreated={loadActions}
          actionTypeRegistry={actionTypeRegistry}
        />
      )}
      {editConnectorProps.initialConnector && (
        <EditConnectorFlyout
          key={`${editConnectorProps.initialConnector.id}${
            editConnectorProps.tab ? `:${editConnectorProps.tab}` : ``
          }`}
          connector={editConnectorProps.initialConnector}
          tab={editConnectorProps.tab}
          onClose={() => {
            setEditConnectorProps({
              tab: editConnectorProps?.tab,
              isFix: editConnectorProps?.isFix,
            });
          }}
          onConnectorUpdated={(connector) => {
            setEditConnectorProps({ ...editConnectorProps, initialConnector: connector });
            loadActions();
          }}
          actionTypeRegistry={actionTypeRegistry}
        />
      )}

      <HealthContextProvider>
        <HealthCheck waitForCheck={true}>
          <Routes>
            <Route exact path={routeToLogs} component={renderLogsList} />
            <Route
              exact
              path={[routeToConnectors, routeToConnectorEdit]}
              render={renderConnectorsList}
            />
          </Routes>
        </HealthCheck>
      </HealthContextProvider>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ActionsConnectorsHome as default };
