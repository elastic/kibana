/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext, useState, useCallback, useReducer, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiForm,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFieldText,
  EuiFlexGrid,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiCard,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiLink,
  EuiPanel,
} from '@elastic/eui';
import { useAppDependencies } from '../..';
import { saveAlert } from '../../lib/api';
import { AlertsContext } from '../../context/alerts_context';
import { alertReducer } from './alert_reducer';
import { ErrableFormRow } from '../../components/page_error';
import { AlertTypeModel, Alert, IErrorObject, ActionTypeModel, AlertAction } from '../../../types';
import { ACTION_GROUPS } from '../../constants/action_groups';

interface Props {
  refreshList: () => Promise<void>;
}

function validateBaseProperties(alertObject: Alert) {
  const validationResult = { errors: {} };
  const errors = {
    name: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!alertObject.name) {
    errors.name.push(
      i18n.translate('xpack.alertingUI.sections.alertAdd.error.requiredNameText', {
        defaultMessage: 'Name is required.',
      })
    );
  }
  return validationResult;
}

export const AlertAdd = ({ refreshList }: Props) => {
  const {
    core: { http },
    plugins: { toastNotifications },
    alertTypeRegistry,
    actionTypeRegistry,
  } = useAppDependencies();
  const [alertType, setAlertType] = useState<AlertTypeModel | undefined>(undefined);

  const initialAlert = {
    alertTypeParams: {},
    alertTypeId: null,
    actions: [],
  };

  const { alertFlyoutVisible, setAlertFlyoutVisibility } = useContext(AlertsContext);
  // hooks
  const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedTabId, setSelectedTabId] = useState<string>('alert');
  const [alertAction, setAlertAction] = useState<AlertAction | undefined>(undefined);

  useEffect(() => {
    dispatch({
      command: { type: 'setAlert' },
      payload: {
        key: 'alert',
        value: {
          alertTypeParams: {},
          alertTypeId: null,
          actions: [],
        },
      },
    });
  }, [alertFlyoutVisible]);

  const setAlertProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setAlertTypeParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setAlertTypeParams' }, payload: { key, value } });
  };

  const setActionParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setAlertActionParam' }, payload: { key, value } });
  };
  const closeFlyout = useCallback(() => {
    setAlertFlyoutVisibility(false);
    setAlertType(undefined);
    setAlertAction(undefined);
    setSelectedTabId('alert');
  }, [setAlertFlyoutVisibility]);

  if (!alertFlyoutVisible) {
    return null;
  }
  const tagsOptions = []; // TODO: move to alert instande when the server side will be done
  const AlertTypeParamsExpressionComponent = alertType ? alertType.alertTypeParamsExpression : null;

  const errors = {
    ...(alertType ? alertType.validate(alert).errors : []),
    ...validateBaseProperties(alert).errors,
  } as IErrorObject;
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  const tabs = [
    {
      id: ACTION_GROUPS.ALERT,
      name: i18n.translate('xpack.alertingUI.sections.alertAdd.alertTabText', {
        defaultMessage: 'Alert',
      }),
    },
    {
      id: ACTION_GROUPS.WARNING,
      name: i18n.translate('xpack.alertingUI.sections.alertAdd.warningTabText', {
        defaultMessage: 'Warning',
      }),
    },
    {
      id: ACTION_GROUPS.UNACKNOWLEDGED,
      name: i18n.translate('xpack.alertingUI.sections.alertAdd.unacknowledgedTabText', {
        defaultMessage: 'If unacknowledged',
      }),
      disabled: false,
    },
  ];

  async function onSaveAlert(): Promise<any> {
    try {
      const newAlert = await saveAlert({ http, alert });
      toastNotifications.addSuccess(
        i18n.translate('xpack.alertingUI.sections.alertAdd.saveSuccessNotificationText', {
          defaultMessage: "Saved '{alertName}'",
          values: {
            alertName: newAlert.id,
          },
        })
      );
      return newAlert;
    } catch (error) {
      return {
        error,
      };
    }
  }

  function addActionType(actionType: ActionTypeModel) {
    setAlertAction({ id: actionType.id, group: selectedTabId, params: {} });
  }

  const alertTypeNodes = alertTypeRegistry.list().map(function(item, index) {
    return (
      <EuiFlexItem key={index}>
        <EuiCard
          icon={<EuiIcon size="xl" type={item.iconClass} />}
          title={item.name}
          description={''}
          onClick={() => setAlertType(item.alertType)}
        />
      </EuiFlexItem>
    );
  });

  const actionTypeNodes = actionTypeRegistry.list().map(function(item, index) {
    return (
      <EuiFlexItem key={index}>
        <EuiCard
          icon={<EuiIcon size="xl" type={item.iconClass} />}
          title={item.name}
          description={''}
          onClick={() => addActionType(item.actionType)}
        />
      </EuiFlexItem>
    );
  });

  const alertTabs = tabs.map(function(tab, index): any {
    return (
      <EuiTab
        onClick={() => setSelectedTabId(tab.id)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
        key={index}
      >
        {tab.name}
      </EuiTab>
    );
  });

  const alertTypeDetails = (
    <Fragment>
      <EuiPanel paddingSize="s">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h5 id="selectedAlertTypeTitle">
                <FormattedMessage
                  defaultMessage={alertType ? alertType.name : ''}
                  id="xpack.alertingUI.sections.alertAdd.selectedAlertTypeTitle"
                />
              </h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink onClick={() => setAlertType(undefined)}>
              <FormattedMessage
                defaultMessage={'Change'}
                id="xpack.alertingUI.sections.alertAdd.changeAlertTypeLink"
              />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
        {AlertTypeParamsExpressionComponent ? (
          <AlertTypeParamsExpressionComponent
            alert={alert}
            errors={errors}
            setAlertTypeParams={setAlertTypeParams}
            hasErrors={hasErrors}
          />
        ) : null}
      </EuiPanel>
    </Fragment>
  );

  let alertDetails;
  if (!alertAction) {
    alertDetails = (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h5 id="alertActionTypeTitle">
            <FormattedMessage
              defaultMessage={'Select an action'}
              id="xpack.alertingUI.sections.alertAdd.selectAlertActionTypeTitle"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGrid columns={4}>{actionTypeNodes}</EuiFlexGrid>
      </Fragment>
    );
  } else {
    alert.actions.push(alertAction);
    const actionTypeRegisterd = actionTypeRegistry.get(alert.actions[0].id);
    if (actionTypeRegisterd === null) return null;
    const ParamsFieldsComponent = actionTypeRegisterd.actionParamsFields;
    alertDetails = (
      <Fragment>
        {ParamsFieldsComponent !== null ? (
          <ParamsFieldsComponent
            action={alert.actions[0].params}
            errors={{}}
            editAction={setActionParams}
            hasErrors={false}
          />
        ) : null}
      </Fragment>
    );
  }

  const warningDetails = <Fragment>Warning</Fragment>;

  const unacknowledgedDetails = <Fragment>Unacknowledged</Fragment>;

  let selectedTabContent;
  switch (selectedTabId) {
    case ACTION_GROUPS.ALERT:
      selectedTabContent = alertDetails;
      break;
    case ACTION_GROUPS.WARNING:
      selectedTabContent = warningDetails;
      break;
    case ACTION_GROUPS.UNACKNOWLEDGED:
      selectedTabContent = unacknowledgedDetails;
      break;
    default:
      selectedTabContent = null;
  }

  let alertTypeArea;
  if (alertType) {
    alertTypeArea = (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiTabs>{alertTabs}</EuiTabs>
        <EuiSpacer size="m" />
        {alertTypeDetails}
        <EuiSpacer size="m" />
        <EuiPanel paddingSize="s">{selectedTabContent}</EuiPanel>
      </Fragment>
    );
  } else {
    alertTypeArea = (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h5 id="alertTypeTitle">
            <FormattedMessage
              defaultMessage={'Select a trigger'}
              id="xpack.alertingUI.sections.alertAdd.selectAlertTypeTitle"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGrid columns={4}>{alertTypeNodes}</EuiFlexGrid>
      </Fragment>
    );
  }

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutAlertAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id="flyoutTitle">
            <FormattedMessage
              defaultMessage={'Create Alert'}
              id="xpack.alertingUI.sections.alertAdd.flyoutTitle"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <ErrableFormRow
                id="alertName"
                label={
                  <FormattedMessage
                    id="xpack.alertingUI.sections.alertAdd.alertNameLabel"
                    defaultMessage="Name"
                  />
                }
                errorKey="name"
                isShowingErrors={hasErrors && alert.name !== undefined}
                errors={errors}
              >
                <EuiFieldText
                  name="name"
                  data-test-subj="alertNameInput"
                  value={alert.name || ''}
                  onChange={e => {
                    setAlertProperty('name', e.target.value);
                  }}
                  onBlur={() => {
                    if (!alert.name) {
                      setAlertProperty('name', '');
                    }
                  }}
                />
              </ErrableFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.alertingUI.sections.actionAdd.indexAction.indexTextFieldLabel',
                  {
                    defaultMessage: 'Tags (optional)',
                  }
                )}
              >
                <EuiComboBox
                  fullWidth
                  async
                  noSuggestions={!tagsOptions.length}
                  options={[]}
                  data-test-subj="tagsComboBox"
                  selectedOptions={(alert.tags || []).map((anIndex: string) => {
                    return {
                      label: anIndex,
                      value: anIndex,
                    };
                  })}
                  onChange={async (selected: EuiComboBoxOptionProps[]) => {
                    setAlertProperty(
                      'tags',
                      selected.map(aSelected => aSelected.value)
                    );
                  }}
                  onBlur={() => {
                    if (!alert.tags) {
                      setAlertProperty('tags', []);
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGrid>
          {alertTypeArea}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>
              {i18n.translate('xpack.alertingUI.sections.alertAdd.cancelButtonLabel', {
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
                const savedAlert = await onSaveAlert();
                setIsSaving(false);
                setAlertFlyoutVisibility(false);
                refreshList();
              }}
            >
              <FormattedMessage
                id="xpack.alertingUI.sections.alertAdd.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
