/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiInMemoryTable,
  EuiButton,
  EuiLink,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBetaBadge,
  EuiToolTip,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiButtonEmpty,
  EuiBadge,
  EuiPageTemplate,
  useEuiTheme,
  EuiIcon,
  EuiConfirmModal,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { getConnectorCompatibility } from '@kbn/actions-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { checkActionTypeEnabled } from '@kbn/alerts-ui-shared/src/check_action_type_enabled';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import {
  useConnectorOAuthConnect,
  OAuthRedirectMode,
  useConnectorOAuthDisconnect,
} from '@kbn/response-ops-oauth-hooks';
import { loadActionTypes, deleteActions } from '../../../lib/action_connector_api';
import {
  hasDeleteActionsCapability,
  hasSaveActionsCapability,
  hasExecuteActionsCapability,
} from '../../../lib/capabilities';
import { DeleteModalConfirmation } from '../../../components/delete_modal_confirmation';
import { usesOAuthAuthorizationCode } from '../../../lib/check_oauth_auth_code';

import type { ActionConnector, ActionConnectorTableItem, ActionTypeIndex } from '../../../../types';
import { EditConnectorTabs } from '../../../../types';
import { EmptyConnectorsPrompt } from '../../../components/prompts/empty_connectors_prompt';
import { useKibana } from '../../../../common/lib/kibana';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import {
  connectorDeprecatedMessage,
  deprecatedMessage,
} from '../../../../common/connectors_selection';
import { getAlertingSectionBreadcrumb } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import { routeToConnectors } from '../../../constants';

const ConnectorIconTipWithSpacing: React.FC = () => {
  return (
    <EuiIconTip
      aria-label="Warning"
      size="m"
      type="warning"
      color="warning"
      content={connectorDeprecatedMessage}
      position="right"
      iconProps={{
        style: { verticalAlign: 'text-top' },
      }}
    />
  );
};

const ActionsConnectorsList = ({
  setAddFlyoutVisibility,
  editItem,
  isLoadingActions,
  actions,
  loadActions,
  setActions,
  connectorAuthStatusError,
}: {
  setAddFlyoutVisibility: (state: boolean) => void;
  editItem: (actionConnector: ActionConnector, tab: EditConnectorTabs, isFix?: boolean) => void;
  isLoadingActions: boolean;
  actions: ActionConnector[];
  loadActions: () => Promise<void>;
  setActions: (state: ActionConnector[]) => void;
  connectorAuthStatusError?: string;
}) => {
  const {
    http,
    notifications: { toasts },
    application: { capabilities },
    setBreadcrumbs,
    chrome,
    docLinks,
    actions: { isEarsEnabled },
  } = useKibana().services;

  const { euiTheme } = useEuiTheme();
  const { connectorId } = useParams<{ connectorId?: string }>();
  const history = useHistory();
  const location = useLocation();
  const canDelete = hasDeleteActionsCapability(capabilities);
  const canSave = hasSaveActionsCapability(capabilities);
  const isDisabledEarsConnector = useCallback(
    (item: ActionConnectorTableItem | ActionConnector) =>
      !isEarsEnabled &&
      'config' in item &&
      (item.config as Record<string, unknown>)?.authType === 'ears',
    [isEarsEnabled]
  );

  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [selectedItems, setSelectedItems] = useState<ActionConnectorTableItem[]>([]);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [connectorsToDelete, setConnectorsToDelete] = useState<string[]>([]);
  const [showWarningText, setShowWarningText] = useState<boolean>(false);

  const disabledActConnectorCss = css`
    .actConnectorsList__tableRowDisabled {
      background-color: ${euiTheme.colors.lightestShade};

      .actConnectorsList__tableCellDisabled {
        color: ${euiTheme.colors.darkShade};
      }
      .euiLink + .euiToolTipAnchor {
        margin-left: ${euiTheme.size.xs};
      }
    }
  `;

  // Set breadcrumb and page title
  useEffect(() => {
    setBreadcrumbs([getAlertingSectionBreadcrumb('connectors')]);
    chrome.docTitle.change(getCurrentDocTitle('connectors'));
  }, [chrome, setBreadcrumbs]);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingActionTypes(true);
        const actionTypes = await loadActionTypes({ http });
        const index: ActionTypeIndex = {};
        for (const actionTypeItem of actionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setActionTypesIndex(index);
      } catch (e) {
        toasts.addDanger({
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.unableToLoadConnectorTypesMessage',
            { defaultMessage: 'Unable to load connector types' }
          ),
        });
      } finally {
        setIsLoadingActionTypes(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionConnectorTableItems: ActionConnectorTableItem[] = actionTypesIndex
    ? actions.map((action) => {
        return {
          ...action,
          actionType: actionTypesIndex[action.actionTypeId]
            ? actionTypesIndex[action.actionTypeId].name
            : action.actionTypeId,
          compatibility: actionTypesIndex[action.actionTypeId]
            ? getConnectorCompatibility(actionTypesIndex[action.actionTypeId].supportedFeatureIds)
            : [],
        };
      })
    : [];

  const actionTypesList: Array<{ value: string; name: string }> = actionTypesIndex
    ? Object.values(actionTypesIndex)
        .map((actionType) => ({
          value: actionType.id,
          name: `${actionType.name} (${getActionsCountByActionType(actions, actionType.id)})`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  useEffect(() => {
    if (connectorId && !isLoadingActions) {
      const connector = actions.find((action) => action.id === connectorId);
      if (connector && !isDisabledEarsConnector(connector)) {
        editItem(connector, EditConnectorTabs.Configuration);
      }

      const linkToConnectors = history.createHref({ pathname: routeToConnectors });

      window.history.replaceState(null, '', linkToConnectors);
    }
  }, [
    actions,
    connectorId,
    editItem,
    history,
    isDisabledEarsConnector,
    isLoadingActions,
    location,
  ]);

  function setDeleteConnectorWarning(connectors: string[]) {
    const show = connectors.some((c) => {
      const action = actions.find((a) => a.id === c);
      return (action && action.referencedByCount ? action.referencedByCount : 0) > 0;
    });
    setShowWarningText(show);
  }

  function onDelete(items: ActionConnectorTableItem[]) {
    const itemIds = items.map((item: any) => item.id);
    setConnectorsToDelete(itemIds);
    setDeleteConnectorWarning(itemIds);
  }

  const actionsTableColumns = [
    {
      field: 'name',
      'data-test-subj': 'connectorsTableCell-name',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.nameTitle',
        {
          defaultMessage: 'Name',
        }
      ),
      sortable: false,
      truncateText: true,
      render: (value: string, item: ActionConnectorTableItem) => {
        const checkEnabledResult = checkActionTypeEnabled(
          actionTypesIndex && actionTypesIndex[item.actionTypeId],
          item.isPreconfigured
        );
        /**
         * TODO: Remove when connectors can provide their own UX message.
         * Issue: https://github.com/elastic/kibana/issues/114507
         */
        const showDeprecatedTooltip = item.isDeprecated;
        const name = getConnectorName(value, item);

        const link = (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj={`edit${item.id}`}
                title={name}
                onClick={() => editItem(item, EditConnectorTabs.Configuration)}
                key={item.id}
                disabled={
                  isDisabledEarsConnector(item) ||
                  (actionTypesIndex ? !actionTypesIndex[item.actionTypeId]?.enabled : true)
                }
              >
                {name}
              </EuiLink>
            </EuiFlexItem>
            {item.isMissingSecrets ? (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  iconProps={{
                    'data-test-subj': `missingSecrets_${item.id}`,
                    style: { verticalAlign: 'text-top' },
                  }}
                  type="warning"
                  color="warning"
                  content={i18n.translate(
                    'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.missingSecretsDescription',
                    { defaultMessage: 'Sensitive information was not imported' }
                  )}
                  position="right"
                />
              </EuiFlexItem>
            ) : null}
            {showDeprecatedTooltip && (
              <EuiFlexItem grow={false}>
                <ConnectorIconTipWithSpacing />
              </EuiFlexItem>
            )}
            {isDisabledEarsConnector(item) && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="warning"
                  color="warning"
                  content={i18n.translate(
                    'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.earsDisabledDescription',
                    {
                      defaultMessage:
                        'EARS authentication is disabled. Enable it via xpack.actions.ears.enabled in kibana.yml.',
                    }
                  )}
                  position="right"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );

        return checkEnabledResult.isEnabled ? (
          link
        ) : (
          <>
            {link}
            <EuiIconTip type="question" content={checkEnabledResult.message} position="right" />
          </>
        );
      },
    },
    {
      field: 'actionType',
      'data-test-subj': 'connectorsTableCell-actionType',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actionTypeTitle',
        {
          defaultMessage: 'Type',
        }
      ),
      sortable: false,
      truncateText: true,
    },
    {
      field: 'compatibility',
      'data-test-subj': 'connectorsTableCell-compatibility',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.compatibility',
        {
          defaultMessage: 'Compatibility',
        }
      ),
      sortable: false,
      truncateText: true,
      render: (compatibility: string[]) => {
        return (
          <EuiFlexGroup
            wrap
            responsive={false}
            gutterSize="xs"
            data-test-subj="compatibility-content"
          >
            {compatibility.map((compatibilityItem: string) => (
              <EuiFlexItem grow={false} key={compatibilityItem}>
                <EuiBadge data-test-subj="connectorsTableCell-compatibility-badge" color="default">
                  {compatibilityItem}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'authMode',
      'data-test-subj': 'connectorsTableCell-authMode',
      name: i18n.translate(
        'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.authModeTitle',
        {
          defaultMessage: 'Authentication',
        }
      ),
      sortable: false,
      truncateText: true,
      render: (authMode: 'shared' | 'per-user') => {
        return authMode === 'shared' ? (
          <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="users" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.authModeShared',
                { defaultMessage: 'Service account' }
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup wrap responsive={false} gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="user" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.authModePerUser',
                { defaultMessage: 'Personal credentials' }
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      name: '',
      render: (item: ActionConnectorTableItem) => {
        if (!actionTypesIndex || !actionTypesIndex[item.actionTypeId]) {
          return null;
        }

        const actionType = actionTypesIndex[item.actionTypeId];
        const showFixButton = item.isMissingSecrets && actionType?.enabled;
        const isStackConnector = actionType.source === ACTION_TYPE_SOURCES.stack;

        return (
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
            {usesOAuthAuthorizationCode(item) && !isDisabledEarsConnector(item) && (
              <>
                {connectorAuthStatusError ? (
                  <DisabledOAuthConnectOperation errorMessage={connectorAuthStatusError} />
                ) : (
                  (item.userAuthStatus === 'connected' ||
                    item.userAuthStatus === 'not_connected') && (
                    <OAuthOperations
                      item={item}
                      onConnectionStatusChange={(changedConnectorId, status) =>
                        setActions(
                          actions.map((connector) =>
                            connector.id === changedConnectorId
                              ? { ...connector, userAuthStatus: status }
                              : connector
                          )
                        )
                      }
                    />
                  )
                )}
              </>
            )}
            <DeleteOperation canDelete={canDelete} item={item} onDelete={() => onDelete([item])} />
            {showFixButton && (
              <EuiFlexItem grow={false} style={{ marginLeft: 4 }}>
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.fixActionDescription',
                    { defaultMessage: 'Fix connector configuration' }
                  )}
                >
                  <EuiButtonEmpty
                    size="xs"
                    data-test-subj="fixConnectorButton"
                    onClick={() => editItem(item, EditConnectorTabs.Configuration, true)}
                  >
                    {i18n.translate(
                      'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.fixButtonLabel',
                      {
                        defaultMessage: 'Fix',
                      }
                    )}
                  </EuiButtonEmpty>
                </EuiToolTip>
              </EuiFlexItem>
            )}
            {!showFixButton && (
              <RunOperation
                canExecute={
                  !isDisabledEarsConnector(item) &&
                  isStackConnector &&
                  hasExecuteActionsCapability(capabilities, actionType?.subFeature)
                }
                item={item}
                onRun={() => editItem(item, EditConnectorTabs.Test)}
              />
            )}
          </EuiFlexGroup>
        );
      },
    },
  ].filter(Boolean) as EuiBasicTableColumn<ActionConnectorTableItem>[];

  const table = (
    <EuiInMemoryTable
      loading={isLoadingActions || isLoadingActionTypes}
      items={actionConnectorTableItems}
      sorting={true}
      itemId={(item: ActionConnectorTableItem) =>
        item.isPreconfigured ? `preconfigured_${item.id}` : item.id
      }
      columns={actionsTableColumns}
      css={disabledActConnectorCss}
      tableCaption={i18n.translate(
        'xpack.triggersActionsUI.sections.actionsConnectorsList.tableCaption',
        { defaultMessage: 'Connectors' }
      )}
      rowProps={(item: ActionConnectorTableItem) => ({
        className:
          isDisabledEarsConnector(item) ||
          (!item.isPreconfigured &&
            (!actionTypesIndex || !actionTypesIndex[item.actionTypeId]?.enabled))
            ? 'actConnectorsList__tableRowDisabled'
            : '',
        'data-test-subj': 'connectors-row',
      })}
      cellProps={(item: ActionConnectorTableItem) => ({
        'data-test-subj': 'cell',
        className:
          isDisabledEarsConnector(item) ||
          !actionTypesIndex ||
          !actionTypesIndex[item.actionTypeId]?.enabled
            ? 'actConnectorsList__tableCellDisabled'
            : '',
      })}
      data-test-subj="actionsTable"
      pagination={{
        initialPageIndex: 0,
        pageIndex,
      }}
      onTableChange={({ page }: Criteria<ActionConnectorTableItem>) => {
        if (page) {
          setPageIndex(page.index);
        }
      }}
      selection={
        canDelete
          ? {
              onSelectionChange(updatedSelectedItemsList: ActionConnectorTableItem[]) {
                setSelectedItems(updatedSelectedItemsList);
              },
              selectable: ({ isPreconfigured }: ActionConnectorTableItem) => !isPreconfigured,
            }
          : undefined
      }
      search={{
        filters: [
          {
            type: 'field_value_selection',
            field: 'actionTypeId',
            name: i18n.translate(
              'xpack.triggersActionsUI.sections.actionsConnectorsList.filters.actionTypeIdName',
              { defaultMessage: 'Type' }
            ),
            multiSelect: 'or',
            options: actionTypesList,
          },
        ],
        toolsLeft:
          selectedItems.length === 0 || !canDelete
            ? []
            : [
                <EuiButton
                  key="delete"
                  iconType="trash"
                  color="danger"
                  data-test-subj="bulkDelete"
                  onClick={() => onDelete(selectedItems)}
                  title={
                    canDelete
                      ? undefined
                      : i18n.translate(
                          'xpack.triggersActionsUI.sections.actionsConnectorsList.buttons.deleteDisabledTitle',
                          { defaultMessage: 'Unable to delete connectors' }
                        )
                  }
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionsConnectorsList.buttons.deleteLabel"
                    defaultMessage="Delete {count}"
                    values={{
                      count: selectedItems.length,
                    }}
                  />
                </EuiButton>,
              ],
      }}
    />
  );

  return (
    <>
      <EuiPageTemplate.Section
        paddingSize="none"
        data-test-subj="actionsList"
        alignment={actionConnectorTableItems.length === 0 ? 'center' : 'top'}
      >
        <DeleteModalConfirmation
          data-test-subj="deleteConnectorsConfirmation"
          onDeleted={(deleted: string[]) => {
            if (selectedItems.length === 0 || selectedItems.length === deleted.length) {
              const updatedActions = actions.filter(
                (action) =>
                  action.id && !(connectorsToDelete.includes(action.id) && !action.isPreconfigured)
              );
              setActions(updatedActions);
              setSelectedItems([]);
            }
            setConnectorsToDelete([]);
          }}
          onErrors={async () => {
            // Refresh the actions from the server, some actions may have beend deleted
            await loadActions();
            setConnectorsToDelete([]);
          }}
          onCancel={async () => {
            setConnectorsToDelete([]);
          }}
          apiDeleteCall={deleteActions}
          idsToDelete={connectorsToDelete}
          singleTitle={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.singleTitle',
            { defaultMessage: 'connector' }
          )}
          multipleTitle={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.multipleTitle',
            { defaultMessage: 'connectors' }
          )}
          showWarningText={showWarningText}
          warningText={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.warningText',
            {
              defaultMessage:
                '{connectors, plural, one {This connector is} other {Some connectors are}} currently in use.',
              values: {
                connectors: connectorsToDelete.length,
              },
            }
          )}
          setIsLoadingState={(isLoading: boolean) => setIsLoadingActionTypes(isLoading)}
        />

        {/* Render the view based on if there's data or if they can save */}
        {(isLoadingActions || isLoadingActionTypes) && <CenterJustifiedSpinner />}
        {actionConnectorTableItems.length !== 0 && table}
        {actionConnectorTableItems.length === 0 &&
          canSave &&
          !isLoadingActions &&
          !isLoadingActionTypes && (
            <EmptyConnectorsPrompt
              onCTAClicked={() => setAddFlyoutVisibility(true)}
              docLinks={docLinks}
            />
          )}
        {actionConnectorTableItems.length === 0 && !canSave && <NoPermissionPrompt />}
      </EuiPageTemplate.Section>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ActionsConnectorsList as default };

function getActionsCountByActionType(actions: ActionConnector[], actionTypeId: string) {
  return actions.filter((action) => action.actionTypeId === actionTypeId).length;
}

function getConnectorName(name: string, connector: ActionConnector): string {
  return connector.isDeprecated ? `${name} ${deprecatedMessage}` : name;
}

const DeleteOperation: React.FunctionComponent<{
  item: ActionConnectorTableItem;
  canDelete: boolean;
  onDelete: () => void;
}> = ({ item, canDelete, onDelete }) => {
  if (item.isPreconfigured) {
    return (
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          data-test-subj="preConfiguredTitleMessage"
          label={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.preconfiguredTitleMessage',
            {
              defaultMessage: 'Preconfigured',
            }
          )}
          tooltipContent="This connector can't be deleted."
        />
      </EuiFlexItem>
    );
  }
  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={
          canDelete
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.deleteActionDescription',
                { defaultMessage: 'Delete this connector' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.deleteActionDisabledDescription',
                { defaultMessage: 'Unable to delete connectors' }
              )
        }
      >
        <EuiButtonIcon
          isDisabled={!canDelete}
          data-test-subj="deleteConnector"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.deleteActionName',
            { defaultMessage: 'Delete' }
          )}
          onClick={onDelete}
          iconType={'trash'}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
};

const DisabledOAuthConnectOperation: React.FunctionComponent<{
  errorMessage: string;
}> = ({ errorMessage }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.oauthAuthStatusLoadFailedTooltip',
          {
            defaultMessage: 'Unable to load connector authentication status. {errorMessage}',
            values: { errorMessage },
          }
        )}
      >
        <EuiButtonIcon
          isDisabled
          data-test-subj="authorizeConnectorDisabledAuthStatusError"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.oauthAuthStatusLoadFailedAuthorizeAriaLabel',
            {
              defaultMessage: 'Authorize unavailable — authentication status could not be loaded',
            }
          )}
          iconType="link"
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
};

const RunOperation: React.FunctionComponent<{
  item: ActionConnectorTableItem;
  canExecute: boolean;
  onRun: () => void;
}> = ({ item, canExecute, onRun }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={
          canExecute
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.runConnectorDescription',
                { defaultMessage: 'Test this connector' }
              )
            : i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.runConnectorDisabledDescription',
                { defaultMessage: 'Unable to test this connector' }
              )
        }
      >
        <EuiButtonIcon
          isDisabled={!canExecute}
          data-test-subj="runConnector"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.runConnectorName',
            { defaultMessage: 'Test' }
          )}
          onClick={onRun}
          iconType={'play'}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
};

const OAuthOperations: React.FunctionComponent<{
  item: ActionConnectorTableItem;
  onConnectionStatusChange: (connectorId: string, status: 'connected' | 'not_connected') => void;
}> = ({ item, onConnectionStatusChange }) => {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const isUserConnectedToConnector = item.userAuthStatus === 'connected';

  const { connect, cancelConnect, isConnecting, isAwaitingCallback } = useConnectorOAuthConnect({
    connectorId: item.id,
    redirectMode: OAuthRedirectMode.NewTab,
    onSuccess: () => {
      onConnectionStatusChange(item.id, 'connected');
      toasts.addSuccess({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.oauthAuthorizationSuccessTitle',
          { defaultMessage: 'Authorization successful' }
        ),
        text: i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.oauthAuthorizationSuccessMessage',
          { defaultMessage: 'Your connector has been authorized successfully.' }
        ),
      });
    },
    onError: (error) => {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.oauthAuthorizationErrorTitle',
          { defaultMessage: 'Authorization failed' }
        ),
        text: error.message,
      });
    },
  });

  const { disconnect, isDisconnecting } = useConnectorOAuthDisconnect({
    connectorId: item.id,
    onSuccess: () => {
      onConnectionStatusChange(item.id, 'not_connected');
      toasts.addSuccess({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.oauthDisconnectSuccessTitle',
          { defaultMessage: 'Disconnected' }
        ),
        text: i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.oauthDisconnectSuccessMessage',
          { defaultMessage: 'Your connector has been disconnected from OAuth.' }
        ),
      });
    },
    onError: (error) => {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.actionsConnectorsList.oauthDisconnectErrorTitle',
          { defaultMessage: 'Disconnect failed' }
        ),
        text: error.message,
      });
    },
  });

  return (
    <>
      {!isUserConnectedToConnector && (
        <EuiFlexItem grow={false}>
          {isAwaitingCallback ? (
            <EuiToolTip
              key="cancel"
              content={i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.cancelAuthorizationDescription',
                { defaultMessage: 'Cancel authorization' }
              )}
            >
              <EuiButtonIcon
                data-test-subj="cancelAuthorizeConnector"
                aria-label={i18n.translate(
                  'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.cancelAuthorizationName',
                  { defaultMessage: 'Cancel authorization' }
                )}
                onClick={cancelConnect}
                iconType="cross"
                color="danger"
              />
            </EuiToolTip>
          ) : (
            <EuiToolTip
              key="authorize"
              content={i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.authorizeConnectorDescription',
                { defaultMessage: 'Authorize connector' }
              )}
            >
              <EuiButtonIcon
                data-test-subj="authorizeConnector"
                aria-label={i18n.translate(
                  'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.authorizeConnectorName',
                  { defaultMessage: 'Authorize' }
                )}
                isLoading={isConnecting}
                disabled={isDisconnecting}
                onClick={connect}
                iconType="link"
              />
            </EuiToolTip>
          )}
        </EuiFlexItem>
      )}
      {isUserConnectedToConnector && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.disconnectConnectorDescription',
              { defaultMessage: 'Disconnect connector' }
            )}
          >
            <EuiButtonIcon
              data-test-subj="disconnectConnector"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.actionsConnectorsList.connectorsListTable.columns.actions.disconnectConnectorName',
                { defaultMessage: 'Disconnect' }
              )}
              isLoading={isDisconnecting}
              disabled={isConnecting || isAwaitingCallback}
              onClick={() => setShowDisconnectConfirm(true)}
              iconType="linkSlash"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {showDisconnectConfirm && (
        <EuiConfirmModal
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.disconnectConfirmAriaLabel',
            { defaultMessage: 'Confirm disconnect connector' }
          )}
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.disconnectConfirmTitle',
            { defaultMessage: 'Disconnect {connectorName}?', values: { connectorName: item.name } }
          )}
          onCancel={() => setShowDisconnectConfirm(false)}
          onConfirm={() => {
            setShowDisconnectConfirm(false);
            disconnect();
          }}
          cancelButtonText={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.disconnectConfirmCancelButton',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.disconnectConfirmButton',
            { defaultMessage: 'Disconnect' }
          )}
          buttonColor="danger"
        >
          {i18n.translate(
            'xpack.triggersActionsUI.sections.actionsConnectorsList.disconnectConfirmMessage',
            {
              defaultMessage: 'You will need to re-authorize to use this connector again.',
            }
          )}
        </EuiConfirmModal>
      )}
    </>
  );
};

const NoPermissionPrompt: React.FunctionComponent<{}> = () => (
  <EuiEmptyPrompt
    iconType="securityApp"
    title={
      <h1>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.actionsConnectorsList.noPermissionToCreateTitle"
          defaultMessage="No permissions to create connectors"
        />
      </h1>
    }
    body={
      <p data-test-subj="permissionDeniedMessage">
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.actionsConnectorsList.noPermissionToCreateDescription"
          defaultMessage="Contact your system administrator."
        />
      </p>
    }
  />
);
