/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext, useState, useCallback, useReducer, useEffect } from 'react';
import { HttpServiceBase } from 'kibana/public';
import { toastNotifications } from 'ui/notify';
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
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Action, ActionType, saveAction } from '../../lib/api';
import { SectionError, ErrableFormRow } from '../../../application/components/page_error';
import { useAppDependencies } from '../..';
import { ActionModel } from '../../models/action';
import { actionReducer } from './action_reducer';
import { ActionsContext } from '../../context/actions_context';

interface Props {
  actionType: ActionType;
  refreshList: () => Promise<void>;
}

export const ActionAdd = ({ actionType, refreshList }: Props) => {
  const {
    core: { http },
    actionTypeRegistry,
  } = useAppDependencies();
  const { flyoutVisible, setFlyoutVisibility } = useContext(ActionsContext);
  // hooks
  const [{ action }, dispatch] = useReducer(actionReducer, {
    action: new ActionModel({ actionTypeId: actionType.id }),
  });

  const setActionProperty = (property: string, value: any) => {
    dispatch({ command: 'setProperty', payload: { property, value } });
  };

  const setActionConfigProperty = (property: string, value: any) => {
    dispatch({ command: 'setConfigProperty', payload: { property, value } });
  };

  const setActionSecretsProperty = (property: string, value: any) => {
    dispatch({ command: 'setSecretsProperty', payload: { property, value } });
  };

  const getAction = () => {
    dispatch({ command: 'setAction', payload: new ActionModel({ actionTypeId: actionType.id }) });
  };

  useEffect(() => {
    getAction();
    setServerError(null);
  }, [flyoutVisible]);

  const closeFlyout = useCallback(() => setFlyoutVisibility(false), []);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [serverError, setServerError] = useState<{
    body: { message: string; error: string };
  } | null>(null);

  if (!flyoutVisible) {
    return null;
  }

  const actionTypeRegisterd = actionTypeRegistry.get(actionType.id);
  if (actionTypeRegisterd === null) return null;
  const FieldsComponent = actionTypeRegisterd.actionFields;
  const errors = { ...actionTypeRegisterd.validate(action).errors, ...action.validate().errors };
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={actionTypeRegisterd.iconClass} size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage={`Create action ${actionType.name}`}
                  id="xpack.alertingUI.sections.actionAdd.flyoutTitle"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          {serverError && (
            <Fragment>
              <SectionError
                title={
                  <FormattedMessage
                    id="xpack.alertingUI.sections.actionAdd.saveActionErrorTitle"
                    defaultMessage="Error saving action"
                  />
                }
                error={serverError}
              />
              <EuiSpacer />
            </Fragment>
          )}
          <ErrableFormRow
            id="actionDescription"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.alertingUI.sections.actionAdd.actionDescritionLabel"
                defaultMessage="Description"
              />
            }
            errorKey="description"
            isShowingErrors={hasErrors && action.description !== undefined}
            errors={errors}
          >
            <EuiFieldText
              fullWidth
              name="description"
              data-test-subj="descriptionInput"
              value={action.description || ''}
              onChange={e => {
                setActionProperty('description', e.target.value);
              }}
              onBlur={() => {
                if (!action.description) {
                  setActionProperty('description', '');
                }
              }}
            />
          </ErrableFormRow>
          <EuiSpacer size="s" />
          {FieldsComponent !== null ? (
            <FieldsComponent
              action={action}
              errors={errors}
              editActionConfig={setActionConfigProperty}
              editActionSecrets={setActionSecretsProperty}
              hasErrors={hasErrors}
            >
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
          ) : null}
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
          <EuiFlexItem grow={false}>
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
                const savedAction = await onActionSave(http, action);
                setIsSaving(false);
                if (savedAction && savedAction.error) {
                  return setServerError(savedAction.error);
                }
                setFlyoutVisibility(false);
                refreshList();
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

export async function onActionSave(http: HttpServiceBase, action: Action): Promise<any> {
  try {
    const newAction = await saveAction({ http, action });
    toastNotifications.addSuccess(
      i18n.translate('xpack.alertingUI.sections.actionAdd.saveSuccessNotificationText', {
        defaultMessage: "Saved '{actionName}'",
        values: {
          actionName: newAction.description,
        },
      })
    );
    return newAction;
  } catch (error) {
    return {
      error,
    };
  }
}
