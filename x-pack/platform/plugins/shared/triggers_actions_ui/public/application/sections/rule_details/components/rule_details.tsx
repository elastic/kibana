/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiPageHeader,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiPageSection,
  EuiCallOut,
  EuiSpacer,
  EuiButtonEmpty,
  EuiButton,
  EuiIcon,
  EuiLink,
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { RuleExecutionStatusErrorReasons, parseDuration } from '@kbn/alerting-plugin/common';
import { getEditRuleRoute, getRuleDetailsRoute } from '@kbn/rule-data-utils';
import { fetchUiConfig as triggersActionsUiConfig } from '@kbn/response-ops-rule-form';
import { UpdateApiKeyModalConfirmation } from '../../../components/update_api_key_modal_confirmation';
import { bulkUpdateAPIKey } from '../../../lib/rule_api/update_api_key';
import { RulesDeleteModalConfirmation } from '../../../components/rules_delete_modal_confirmation';
import { RuleActionsPopover } from './rule_actions_popover';
import {
  hasAllPrivilege,
  hasExecuteActionsCapability,
  hasManageApiKeysCapability,
} from '../../../lib/capabilities';
import { getRulesBreadcrumbWithHref } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import type {
  Rule,
  RuleType,
  ActionType,
  ActionConnector,
  TriggersActionsUiConfig,
} from '../../../../types';
import type { ComponentOpts as BulkOperationsComponentOpts } from '../../common/components/with_bulk_rule_api_operations';
import { withBulkRuleOperations } from '../../common/components/with_bulk_rule_api_operations';
import { RuleRouteWithApi } from './rule_route';
import { ViewInApp } from './view_in_app';
import { ViewLinkedObject } from './view_linked_object';
import { routeToHome } from '../../../constants';
import {
  rulesErrorReasonTranslationsMapping,
  rulesWarningReasonTranslationsMapping,
} from '../../rules_list/translations';
import { useKibana } from '../../../../common/lib/kibana';
import { loadAllActions as loadConnectors } from '../../../lib/action_connector_api';
import { runRule } from '../../../lib/run_rule';
import {
  getConfirmDeletionButtonText,
  getConfirmDeletionModalText,
  SINGLE_RULE_TITLE,
  MULTIPLE_RULE_TITLE,
} from '../../rules_list/translations';
import { useBulkOperationToast } from '../../../hooks/use_bulk_operation_toast';
import type { RefreshToken } from './types';
import { UntrackAlertsModal } from '../../common/components/untrack_alerts_modal';

export type RuleDetailsProps = {
  rule: Rule;
  ruleType: RuleType;
  actionTypes: ActionType[];
  requestRefresh: () => Promise<void>;
  refreshToken?: RefreshToken;
} & Pick<
  BulkOperationsComponentOpts,
  'bulkDisableRules' | 'bulkEnableRules' | 'bulkDeleteRules' | 'snoozeRule' | 'unsnoozeRule'
>;

const ruleDetailStyle = {
  minWidth: 0,
};

export const RuleDetails: React.FunctionComponent<RuleDetailsProps> = ({
  rule,
  ruleType,
  bulkDisableRules,
  bulkEnableRules,
  bulkDeleteRules,
  requestRefresh,
  refreshToken,
}) => {
  const history = useHistory();
  const {
    application,
    ruleTypeRegistry,
    setBreadcrumbs,
    chrome,
    http,
    i18n: i18nStart,
    theme,
    userProfile,
    notifications: { toasts },
  } = useKibana().services;
  const { capabilities, navigateToApp, getUrlForApp, isAppRegistered, currentAppId$ } = application;
  const currentAppId = useObservable(currentAppId$, undefined);
  const isInRulesApp = currentAppId === 'rules';

  const [rulesToDelete, setRulesToDelete] = useState<string[]>([]);
  const [rulesToUpdateAPIKey, setRulesToUpdateAPIKey] = useState<string[]>([]);
  const [isUntrackAlertsModalOpen, setIsUntrackAlertsModalOpen] = useState<boolean>(false);

  const [hasActionsWithBrokenConnector, setHasActionsWithBrokenConnector] =
    useState<boolean>(false);

  const [config, setConfig] = useState<TriggersActionsUiConfig>({ isUsingSecurity: false });

  useEffect(() => {
    (async () => {
      setConfig(await triggersActionsUiConfig({ http }));
    })();
  }, [http]);

  // Set breadcrumb and page title
  useEffect(() => {
    const rulesBreadcrumbWithAppPath = getRulesBreadcrumbWithHref(isAppRegistered, getUrlForApp);
    setBreadcrumbs([rulesBreadcrumbWithAppPath, { text: rule.name }]);
    chrome.docTitle.change(getCurrentDocTitle('rules'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Determine if any attached action has an issue with its connector
  useEffect(() => {
    (async () => {
      let loadedConnectors: ActionConnector[] = [];
      try {
        loadedConnectors = await loadConnectors({ http, includeSystemActions: true });
      } catch (err) {
        loadedConnectors = [];
      }

      if (loadedConnectors.length > 0) {
        const hasActionWithBrokenConnector = rule.actions.some(
          (action) => !loadedConnectors.find((connector) => connector.id === action.id)
        );
        if (setHasActionsWithBrokenConnector) {
          setHasActionsWithBrokenConnector(hasActionWithBrokenConnector);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canExecuteActions = hasExecuteActionsCapability(capabilities);
  const canSaveRule =
    hasAllPrivilege(rule.consumer, ruleType) &&
    // if the rule has actions, can the user save the rule's action params
    (canExecuteActions || (!canExecuteActions && rule.actions.length === 0));

  const hasEditButton =
    // can the user save the rule
    canSaveRule &&
    // is this rule type editable from within Rules Management
    (ruleTypeRegistry.has(rule.ruleTypeId)
      ? !ruleTypeRegistry.get(rule.ruleTypeId).requiresAppContext
      : false) &&
    !ruleType.isInternallyManaged;

  const onRunRule = async (id: string) => {
    await runRule(http, toasts, id);
  };

  // Check whether interval is below configured minium
  useEffect(() => {
    if (rule.schedule.interval && config.minimumScheduleInterval) {
      if (
        parseDuration(rule.schedule.interval) < parseDuration(config.minimumScheduleInterval.value)
      ) {
        const configurationToast = toasts.addInfo({
          'data-test-subj': 'intervalConfigToast',
          title: i18n.translate(
            'xpack.triggersActionsUI.sections.ruleDetails.scheduleIntervalToastTitle',
            {
              defaultMessage: 'Configuration settings',
            }
          ),
          text: toMountPoint(
            <>
              <p>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleDetails.scheduleIntervalToastMessage"
                  defaultMessage="This rule has an interval set below the minimum configured interval. This may impact performance."
                />
              </p>
              {hasEditButton && (
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="ruleIntervalToastEditButton"
                      onClick={() => {
                        toasts.remove(configurationToast);
                        onEditRuleClick();
                      }}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.scheduleIntervalToastMessageButton"
                        defaultMessage="Edit rule"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </>,
            { i18n: i18nStart, theme, userProfile }
          ),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    i18nStart,
    theme,
    userProfile,
    rule.schedule.interval,
    config.minimumScheduleInterval,
    toasts,
    hasEditButton,
  ]);

  const getRuleStatusErrorReasonText = () => {
    if (rule.executionStatus.error && rule.executionStatus.error.reason) {
      return rulesErrorReasonTranslationsMapping[rule.executionStatus.error.reason];
    } else {
      return rulesErrorReasonTranslationsMapping.unknown;
    }
  };

  const getRuleStatusWarningReasonText = () => {
    if (rule.executionStatus.warning && rule.executionStatus.warning.reason) {
      return rulesWarningReasonTranslationsMapping[rule.executionStatus.warning.reason];
    } else {
      return rulesWarningReasonTranslationsMapping.unknown;
    }
  };

  const onEditRuleClick = () => {
    navigateToApp('management', {
      path: `insightsAndAlerting/triggersActions/${getEditRuleRoute(rule.id)}`,
      state: {
        returnApp: 'management',
        returnPath: `insightsAndAlerting/triggersActions/${getRuleDetailsRoute(rule.id)}`,
      },
    });
  };

  const editButton = hasEditButton ? (
    <>
      <EuiButtonEmpty
        aria-label={i18n.translate(
          'xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel',
          {
            defaultMessage: 'Edit',
          }
        )}
        data-test-subj="openEditRuleFlyoutButton"
        iconType="pencil"
        onClick={onEditRuleClick}
        name="edit"
        disabled={!ruleType.enabledInLicense}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.ruleDetails.editRuleButtonLabel"
          defaultMessage="Edit"
        />
      </EuiButtonEmpty>
    </>
  ) : null;

  const [isDeleteModalFlyoutVisible, setIsDeleteModalVisibility] = useState<boolean>(false);
  const { showToast } = useBulkOperationToast({});

  const onDeleteConfirm = async () => {
    setIsDeleteModalVisibility(false);
    const { errors, total } = await bulkDeleteRules({
      ids: rulesToDelete,
    });
    showToast({ action: 'DELETE', errors, total });
    setRulesToDelete([]);
    history.push(routeToHome);
  };

  const onDeleteCancel = () => {
    setIsDeleteModalVisibility(false);
    setRulesToDelete([]);
  };

  const onDisableModalOpen = () => {
    setIsUntrackAlertsModalOpen(true);
  };

  const onDisableModalClose = () => {
    setIsUntrackAlertsModalOpen(false);
  };

  const onEnable = async () => {
    await bulkEnableRules({ ids: [rule.id] });
    requestRefresh();
  };

  const onDisable = async (untrack: boolean) => {
    onDisableModalClose();
    await bulkDisableRules({ ids: [rule.id], untrack });
    requestRefresh();
  };

  const onEnableDisable = (enable: boolean) => {
    if (enable) {
      onEnable();
    } else if (ruleType.autoRecoverAlerts === false) {
      onDisable(false);
    } else {
      onDisableModalOpen();
    }
  };

  return (
    <>
      {isDeleteModalFlyoutVisible && (
        <RulesDeleteModalConfirmation
          onConfirm={onDeleteConfirm}
          onCancel={onDeleteCancel}
          confirmButtonText={getConfirmDeletionButtonText(
            rulesToDelete.length,
            SINGLE_RULE_TITLE,
            MULTIPLE_RULE_TITLE
          )}
          confirmModalText={getConfirmDeletionModalText(
            rulesToDelete.length,
            SINGLE_RULE_TITLE,
            MULTIPLE_RULE_TITLE
          )}
        />
      )}
      {isUntrackAlertsModalOpen && (
        <UntrackAlertsModal onCancel={onDisableModalClose} onConfirm={onDisable} />
      )}
      <UpdateApiKeyModalConfirmation
        onCancel={() => {
          setRulesToUpdateAPIKey([]);
        }}
        idsToUpdate={rulesToUpdateAPIKey}
        apiUpdateApiKeyCall={bulkUpdateAPIKey}
        setIsLoadingState={() => {}}
        onUpdated={async () => {
          setRulesToUpdateAPIKey([]);
          requestRefresh();
        }}
      />
      <EuiPageHeader
        data-test-subj="ruleDetailsTitle"
        bottomBorder
        pageTitle={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleDetails.ruleDetailsTitle"
            defaultMessage="{ruleName}"
            values={{ ruleName: rule.name }}
          />
        }
        description={
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <p>
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.ruleTypeTitle"
                        defaultMessage="Type"
                      />
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge data-test-subj="ruleTypeLabel">{ruleType.name}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {hasManageApiKeysCapability(capabilities) && rule.apiKeyOwner && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <p>
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.apiKeyOwnerTitle"
                          defaultMessage="API key owner"
                        />
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" data-test-subj="apiKeyOwnerLabel">
                      <b>{rule.apiKeyOwner}</b>
                      {rule.apiKeyCreatedByUser ? (
                        <>
                          &nbsp;
                          <EuiIconTip
                            position="right"
                            content={i18n.translate(
                              'xpack.triggersActionsUI.sections.ruleDetails.userManagedApikey',
                              {
                                defaultMessage: 'This rule is associated with an API key.',
                              }
                            )}
                          />
                        </>
                      ) : null}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        rightSideItems={[
          canSaveRule && (
            <RuleActionsPopover
              rule={rule}
              onDelete={(ruleId) => {
                setIsDeleteModalVisibility(true);
                setRulesToDelete([ruleId]);
              }}
              onApiKeyUpdate={(ruleId) => {
                setRulesToUpdateAPIKey([ruleId]);
              }}
              onEnableDisable={onEnableDisable}
              onRunRule={onRunRule}
              isInternallyManaged={ruleType.isInternallyManaged}
            />
          ),
          editButton,
          <EuiButtonEmpty
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.ruleDetails.refreshRulesButtonLabel',
              {
                defaultMessage: 'Refresh',
              }
            )}
            data-test-subj="refreshRulesButton"
            iconType="refresh"
            onClick={requestRefresh}
            name="refresh"
            color="primary"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.rulesList.refreshRulesButtonLabel"
              defaultMessage="Refresh"
            />
          </EuiButtonEmpty>,
          isInRulesApp ? <ViewLinkedObject rule={rule} /> : <ViewInApp rule={rule} />,
        ]}
      />
      <EuiPageSection>
        {rule.enabled &&
        rule.executionStatus.error?.reason === RuleExecutionStatusErrorReasons.License ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut
                announceOnMount
                color="danger"
                data-test-subj="ruleErrorBanner"
                size="s"
                iconType="error"
                title={getRuleStatusErrorReasonText()}
              >
                <EuiText size="xs">{rule.executionStatus.error?.message}</EuiText>
                <EuiSpacer size="s" />
                <EuiLink
                  href={`${http.basePath.get()}/app/management/stack/license_management`}
                  color="primary"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.manageLicensePlanBannerLinkTitle"
                    defaultMessage="Manage license"
                  />
                </EuiLink>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        {rule.enabled && rule.executionStatus.status === 'warning' ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut
                announceOnMount
                color="warning"
                data-test-subj="ruleWarningBanner"
                size="s"
                iconType="warning"
              >
                <p>
                  <EuiIcon color="warning" type="warning" />
                  &nbsp;
                  {getRuleStatusWarningReasonText()}
                  &nbsp;
                  {rule.executionStatus.warning?.message}
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        {hasActionsWithBrokenConnector && (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiSpacer size="s" />
              <EuiCallOut
                announceOnMount
                color="warning"
                data-test-subj="actionWithBrokenConnectorWarningBanner"
                size="s"
              >
                <p>
                  <EuiIcon color="warning" type="warning" />
                  &nbsp;
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.actionWithBrokenConnectorWarningBannerTitle"
                    defaultMessage="There is an issue with one of the connectors associated with this rule."
                  />
                  &nbsp;
                  {hasEditButton && (
                    <EuiLink
                      data-test-subj="actionWithBrokenConnectorWarningBannerEdit"
                      color="primary"
                      onClick={onEditRuleClick}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.actionWithBrokenConnectorWarningBannerEditText"
                        defaultMessage="Edit rule"
                      />
                    </EuiLink>
                  )}
                </p>
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiFlexGroup>
          <EuiFlexItem style={ruleDetailStyle}>
            <RuleRouteWithApi
              requestRefresh={requestRefresh}
              refreshToken={refreshToken}
              rule={rule}
              ruleType={ruleType}
              readOnly={!canSaveRule}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </>
  );
};

export const RuleDetailsWithApi = withBulkRuleOperations(RuleDetails);
