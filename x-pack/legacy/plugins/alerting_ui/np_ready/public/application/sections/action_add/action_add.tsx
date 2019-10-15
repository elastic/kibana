/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext, useState, useCallback } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiForm,
  EuiCallOut,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyout,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Action, ActionType } from '../../lib/api';
import { ActionsContext } from '../../context/app_context';
import {
  WebhookActionFields,
  LoggingActionFields,
  IndexActionFields,
  SlackActionFields,
  EmailActionFields,
  PagerDutyActionFields,
} from './action_fields';
import { SectionError } from '../../../application/components/page_error';
import { actionTypesSettings, BUILDIN_ACTION_TYPES } from '../../constants/action_types_settings';

const actionFieldsComponentMap = {
  [BUILDIN_ACTION_TYPES.LOGGING]: LoggingActionFields,
  [BUILDIN_ACTION_TYPES.SLACK]: SlackActionFields,
  [BUILDIN_ACTION_TYPES.EMAIL]: EmailActionFields,
  [BUILDIN_ACTION_TYPES.INDEX]: IndexActionFields,
  [BUILDIN_ACTION_TYPES.WEBHOOK]: WebhookActionFields,
  [BUILDIN_ACTION_TYPES.PAGERDUTY]: PagerDutyActionFields,
};

interface Props {
  actionType: ActionType | null;
}

export const ActionAdd = ({ actionType }: Props) => {
  const { flyoutVisible, setFlyoutVisibility } = useContext(ActionsContext);
  const closeFlyout = useCallback(() => setFlyoutVisibility(false), []);
  const [isExecuting, setIsExecuting] = useState<{ [key: string]: boolean }>({});
  const [executeResultsError, setExecuteResultsError] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [serverError, setServerError] = useState<{
    data: { nessage: string; error: string };
  } | null>(null);

  if (!flyoutVisible) {
    return null;
  }
  if (!actionType) return null;
  const FieldsComponent = actionFieldsComponentMap[actionType.id];
  const actionSettings = actionTypesSettings(actionType.id);
  const hasErrors = false; // !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);
  const action = { actionTypeId: actionType.id, config: {} } as Action;

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutAlertEditTitle" size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={actionSettings.iconClass} size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage={`Create action ${actionType.name}`}
                  id="xpack.alerting.createAlertFlyout.flyoutTitle"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {executeResultsError && executeResultsError[action.id] && (
          <Fragment>
            <SectionError
              title={
                <FormattedMessage
                  id="xpack.alertingUI.sections.actionAdd.accordion.simulateResultsErrorTitle"
                  defaultMessage="Error testing action"
                />
              }
              error={executeResultsError[action.id]}
            />
            <EuiSpacer size="s" />
          </Fragment>
        )}
        <EuiForm>
          <FieldsComponent action={action} errors={{}} hasErrors={hasErrors}>
            {actionType.id === null ? (
              <Fragment>
                <EuiCallOut
                  title={i18n.translate(
                    'xpack.alertingUI.sections.actionAdd.actions.actionConfigurationWarningTitleText',
                    {
                      defaultMessage: 'Account may not be configured',
                    }
                  )}
                  color="warning"
                  iconType="help"
                >
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.alertingUI.sections.actionAdd.actions.actionConfigurationWarningDescriptionText"
                        defaultMessage="To create this action, you must configure at least one {accountType} account. {docLink}"
                        values={{
                          accountType: actionType.name,
                          docLink: (
                            <EuiLink target="_blank">
                              <FormattedMessage
                                id="xpack.alertingUI.sections.actionAdd.actions.actionConfigurationWarningHelpLinkText"
                                defaultMessage="Learn more."
                              />
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </EuiText>
                </EuiCallOut>
                <EuiSpacer />
              </Fragment>
            ) : null}
          </FieldsComponent>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => setFlyoutVisibility(false)}>
              {i18n.translate('xpack.alertingUI.sections.actionAdd.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              type="submit"
              isDisabled={hasErrors}
              isLoading={isExecuting[action.id]}
              data-test-subj="simulateActionButton"
              onClick={async () => {
                setIsExecuting({ [action.id]: true });
                setExecuteResultsError(null);
                setIsExecuting({ [action.id]: false });
              }}
            >
              {i18n.translate('xpack.alertingUI.sections.actionAdd.testButtonLabel', {
                defaultMessage: 'Test',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              fill
              color="secondary"
              data-test-subj="saveActionButton"
              type="submit"
              iconType="check"
              isDisabled={hasErrors}
              isLoading={isSaving}
              onClick={async () => {
                setIsSaving(true);
                const savedAction = await onActionSave(action);
                if (savedAction && savedAction.error) {
                  setIsSaving(false);
                  return setServerError(savedAction.error);
                }
              }}
            >
              <FormattedMessage
                id="xpack.alertingUI.sections.actionAdd.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export async function onActionSave(action: Action): Promise<any> {
  return [];
}
