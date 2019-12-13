/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext, useState, useReducer, useEffect } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiCallOut,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFieldText,
  EuiFlyoutBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createActionConnector, updateActionConnector } from '../../lib/action_connector_api';
import { SectionError, ErrableFormRow } from '../../components/page_error';
import { useAppDependencies } from '../../app_dependencies';
import { connectorReducer } from './connector_reducer';
import { ActionsConnectorsContext } from '../../context/actions_connectors_context';
import { ActionConnector, IErrorObject } from '../../../types';

interface ActionConnectorProps {
  initialConnector: any;
  actionTypeName: string;
  setFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ActionConnectorForm = ({
  initialConnector,
  actionTypeName,
  setFlyoutVisibility,
}: ActionConnectorProps) => {
  const {
    core: { http },
    plugins: { capabilities, toastNotifications },
    actionTypeRegistry,
  } = useAppDependencies();

  const { reloadConnectors } = useContext(ActionsConnectorsContext);
  const canSave = capabilities.get().actions.save;

  // hooks
  const [{ connector }, dispatch] = useReducer(connectorReducer, { connector: initialConnector });

  const setActionProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setConnector = (key: string, value: any) => {
    dispatch({ command: { type: 'setConnector' }, payload: { key, value } });
  };

  const setActionConfigProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setConfigProperty' }, payload: { key, value } });
  };

  const setActionSecretsProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setSecretsProperty' }, payload: { key, value } });
  };

  useEffect(() => {
    setConnector('connector', initialConnector);
    setServerError(null);
  }, [initialConnector]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [serverError, setServerError] = useState<{
    body: { message: string; error: string };
  } | null>(null);

  const actionTypeRegisterd = actionTypeRegistry.get(initialConnector.actionTypeId);
  if (!actionTypeRegisterd) return null;

  function validateBaseProperties(actionObject: ActionConnector) {
    const validationResult = { errors: {} };
    const errors = {
      description: new Array<string>(),
    };
    validationResult.errors = errors;
    if (!actionObject.name) {
      errors.description.push(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredNameText',
          {
            defaultMessage: 'Description is required.',
          }
        )
      );
    }
    return validationResult;
  }

  const FieldsComponent = actionTypeRegisterd.actionConnectorFields;
  const errors = {
    ...actionTypeRegisterd.validateConnector(connector).errors,
    ...validateBaseProperties(connector).errors,
  } as IErrorObject;
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  async function onActionConnectorSave(): Promise<any> {
    try {
      let message;
      let savedConnector;
      if (connector.id === undefined) {
        savedConnector = await createActionConnector({ http, connector });
        message = i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.saveSuccessNotificationText',
          {
            defaultMessage: "Created '{connectorName}'",
            values: {
              connectorName: savedConnector.name,
            },
          }
        );
      } else {
        savedConnector = await updateActionConnector({ http, connector, id: connector.id });
        message = i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.saveSuccessNotificationText',
          {
            defaultMessage: "Updated '{connectorName}'",
            values: {
              connectorName: savedConnector.name,
            },
          }
        );
      }
      toastNotifications.addSuccess(message);
      return savedConnector;
    } catch (error) {
      return {
        error,
      };
    }
  }

  return (
    <Fragment>
      <EuiFlyoutBody>
        <EuiForm>
          {serverError && (
            <Fragment>
              <SectionError
                title={
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionConnectorForm.saveActionErrorTitle"
                    defaultMessage="Error saving action"
                  />
                }
                error={serverError}
              />
              <EuiSpacer />
            </Fragment>
          )}
          <ErrableFormRow
            id="actionName"
            fullWidth
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.actionConnectorForm.actionNameLabel"
                defaultMessage="Name"
              />
            }
            errorKey="name"
            isShowingErrors={hasErrors && connector.name !== undefined}
            errors={errors}
          >
            <EuiFieldText
              fullWidth
              name="name"
              data-test-subj="nameInput"
              value={connector.name || ''}
              onChange={e => {
                setActionProperty('name', e.target.value);
              }}
              onBlur={() => {
                if (!connector.name) {
                  setActionProperty('name', '');
                }
              }}
            />
          </ErrableFormRow>
          <EuiSpacer size="s" />
          {FieldsComponent !== null ? (
            <FieldsComponent
              action={connector}
              errors={errors}
              editActionConfig={setActionConfigProperty}
              editActionSecrets={setActionSecretsProperty}
              hasErrors={hasErrors}
            >
              {initialConnector.actionTypeId === null ? (
                <Fragment>
                  <EuiCallOut
                    title={i18n.translate(
                      'xpack.triggersActionsUI.sections.actionConnectorForm.actions.actionConfigurationWarningTitleText',
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
                          id="xpack.triggersActionsUI.sections.actionConnectorForm.actions.actionConfigurationWarningDescriptionText"
                          defaultMessage="To create this action, you must configure at least one {accountType} account. {docLink}"
                          values={{
                            accountType: actionTypeName,
                            docLink: (
                              <EuiLink target="_blank">
                                <FormattedMessage
                                  id="xpack.triggersActionsUI.sections.actionConnectorForm.actions.actionConfigurationWarningHelpLinkText"
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
              {i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorForm.cancelButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canSave ? (
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
                  const savedAction = await onActionConnectorSave();
                  setIsSaving(false);
                  if (savedAction && savedAction.error) {
                    return setServerError(savedAction.error);
                  }
                  setFlyoutVisibility(false);
                  reloadConnectors();
                }}
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.actionConnectorForm.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};
