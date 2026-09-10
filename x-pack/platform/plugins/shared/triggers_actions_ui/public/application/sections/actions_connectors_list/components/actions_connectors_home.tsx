/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { useLocation, matchPath } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import type { Section } from '../../../constants';
import { routeToConnectorEdit, routeToConnectors, routeToLogs } from '../../../constants';
import { getAlertingSectionBreadcrumb } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import { suspendedComponentWithProps } from '../../../lib/suspended_component_with_props';
import { HealthContextProvider } from '../../../context/health_context';
import { HealthCheck } from '../../../components/health_check';
import { useKibana } from '../../../../common/lib/kibana';
import ConnectorEventLogListTableWithApi from './actions_connectors_event_log_list_table';
import type { ActionConnector } from '../../../../types';
import type { EditConnectorTabs } from '../../../../types';
import { CreateConnectorFlyout } from '../../action_connector_form/create_connector_flyout';
import { EditConnectorFlyout } from '../../action_connector_form/edit_connector_flyout';
import type { EditConnectorProps } from './types';
import { loadAllActions, loadConnectorAuthStatus } from '../../../lib/action_connector_api';
import { hasSaveActionsCapability } from '../../../lib/capabilities';
import { useSkippedPreconfiguredConnectorIds } from '../../../hooks/use_conflicted_connector_ids';

type ConnectorAuthStatusError = string | undefined;

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
    application: { capabilities },
  } = useKibana().services;

  const location = useLocation();

  const { skippedPreconfiguredConnectorIds } = useSkippedPreconfiguredConnectorIds();

  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const [editConnectorProps, setEditConnectorProps] = useState<EditConnectorProps>({});
  const [actions, setActions] = useState<ActionConnector[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState<boolean>(true);
  const [connectorAuthStatusError, setConnectorAuthStatusError] =
    useState<ConnectorAuthStatusError>(undefined);

  const editItem = useCallback(
    (actionConnector: ActionConnector, tab: EditConnectorTabs, isFix?: boolean) => {
      setEditConnectorProps({ initialConnector: actionConnector, tab, isFix: isFix ?? false });
    },
    [setEditConnectorProps]
  );

  const loadActions = useCallback(async () => {
    setIsLoadingActions(true);
    try {
      const [actionsResponse, authStatusMap] = await Promise.all([
        loadAllActions({ http }),
        loadConnectorAuthStatus({ http }).catch((error) => {
          const message =
            error?.body?.message ??
            i18n.translate(
              'xpack.triggersActionsUI.sections.connector.home.unableToLoadAuthStatusFallbackDetail',
              {
                defaultMessage: 'Check the Kibana logs for more information.',
              }
            );
          setConnectorAuthStatusError(message);
          return null;
        }),
      ]);

      if (authStatusMap !== null) {
        setConnectorAuthStatusError(undefined);
      }

      const actionsWithAuth = actionsResponse.map((connector) => {
        const authEntry = authStatusMap?.[connector.id];
        if (!authEntry) {
          return connector;
        }
        return { ...connector, userAuthStatus: authEntry.userAuthStatus };
      });

      setActions(actionsWithAuth);
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

  const isConnectorsSection =
    matchPath(location.pathname, {
      path: routeToConnectors,
      exact: true,
    }) != null || matchPath(location.pathname, { path: routeToConnectorEdit, exact: true }) != null;

  const canSave = hasSaveActionsCapability(capabilities);

  const tabs = useMemo<AppHeaderTab[]>(
    () => [
      {
        id: 'connectors',
        label: i18n.translate('xpack.triggersActionsUI.connectors.home.connectorsTabTitle', {
          defaultMessage: 'Connectors',
        }),
        isSelected: section === 'connectors',
        onClick: () => history.push('/connectors'),
        'data-test-subj': 'connectorsTab',
      },
      {
        id: 'logs',
        label: i18n.translate('xpack.triggersActionsUI.connectors.home.logsTabTitle', {
          defaultMessage: 'Logs',
        }),
        isSelected: section === 'logs',
        onClick: () => history.push('/logs'),
        'data-test-subj': 'logsTab',
      },
    ],
    [history, section]
  );

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      primaryActionItem:
        isConnectorsSection && canSave
          ? {
              id: 'createConnector',
              label: i18n.translate('xpack.triggersActionsUI.connectors.home.createConnector', {
                defaultMessage: 'Create connector',
              }),
              iconType: 'plusCircle',
              testId: 'createConnectorButton',
              run: () => setAddFlyoutVisibility(true),
            }
          : undefined,
    }),
    [canSave, isConnectorsSection]
  );

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
      connectorAuthStatusError,
    });
  };

  return (
    <>
      <AppHeader
        title={i18n.translate('xpack.triggersActionsUI.connectors.home.appTitle', {
          defaultMessage: 'Connectors',
        })}
        description={i18n.translate('xpack.triggersActionsUI.connectors.home.description', {
          defaultMessage: 'Connect third-party software with your alerting data.',
        })}
        tabs={tabs}
        menu={menu}
        docLink={docLinks.links.alerting.actionTypes}
        spacing="bleed"
      />

      <EuiSpacer size="l" />

      {skippedPreconfiguredConnectorIds.length > 0 && (
        <>
          <EuiCallOut
            announceOnMount={false}
            color="warning"
            size="s"
            data-test-subj="preconfiguredSkippedBanner"
            title={
              <FormattedMessage
                id="xpack.triggersActionsUI.connectors.home.preconfiguredSkippedWarning"
                defaultMessage="{count, plural, one {Preconfigured connector} other {Preconfigured connectors}} with {count, plural, one {ID} other {IDs}} [{ids}] {count, plural, one {was} other {were}} skipped because {count, plural, one {it conflicts} other {they conflict}} with an already existing connector."
                values={{
                  count: skippedPreconfiguredConnectorIds.length,
                  ids: skippedPreconfiguredConnectorIds.join(', '),
                }}
              />
            }
          />
          <EuiSpacer size="s" />
        </>
      )}

      {addFlyoutVisible && (
        <CreateConnectorFlyout
          onClose={() => {
            setAddFlyoutVisibility(false);
            loadActions();
          }}
          onTestConnector={loadActions}
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
