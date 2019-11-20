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
  EuiLink,
  EuiFieldNumber,
  EuiSelect,
  EuiIconTip,
  EuiBadge,
  EuiPortal,
} from '@elastic/eui';
import { useAppDependencies } from '../..';
import { saveAlert, loadActionTypes } from '../../lib/api';
import { AlertsContext } from '../../context/alerts_context';
import { alertReducer } from './alert_reducer';
import { ErrableFormRow } from '../../components/page_error';
import {
  AlertTypeModel,
  Alert,
  IErrorObject,
  ActionTypeModel,
  AlertAction,
  ActionTypeIndex,
} from '../../../types';
import { ACTION_GROUPS } from '../../constants/action_groups';
import { getTimeOptions } from '../../lib/get_time_options';

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
  const initialAlert = {
    alertTypeParams: {},
    alertTypeId: null,
    actions: [],
  };

  const { alertFlyoutVisible, setAlertFlyoutVisibility } = useContext(AlertsContext);
  // hooks
  const [alertType, setAlertType] = useState<AlertTypeModel | undefined>(undefined);
  const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [selectedTabId, setSelectedTabId] = useState<string>('alert');
  const [alertAction, setAlertAction] = useState<AlertAction | undefined>(undefined);
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);

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
        toastNotifications.addDanger({
          title: i18n.translate(
            'xpack.alertingUI.sections.alertAdd.unableToLoadActionTypesMessage',
            { defaultMessage: 'Unable to load action types' }
          ),
        });
      } finally {
        setIsLoadingActionTypes(false);
      }
    })();
  }, [toastNotifications, http]);

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

  const actionErrors = alert.actions.reduce((acc: any, alertActionType: any) => {
    const actionType = actionTypeRegistry.get(alertActionType.id);
    if (!actionType) {
      return [];
    }
    const actionValidationErrors = actionType.validateParams(alertActionType.params);
    acc[alertActionType.id] = actionValidationErrors;
    return acc;
  }, {});

  const hasActionErrors = !!Object.keys(actionErrors).find(actionError => {
    return !!Object.keys(actionErrors[actionError]).find((actionErrorKey: string) => {
      return actionErrors[actionError][actionErrorKey].length >= 1;
    });
  });

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
          title={actionTypesIndex ? actionTypesIndex[item.id].name : item.name}
          description={''}
          selectable={{
            onClick: () => addActionType(item.actionType),
          }}
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
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h5 id="selectedAlertTypeTitle">
              <FormattedMessage
                defaultMessage={'Trigger: {alertType}'}
                id="xpack.alertingUI.sections.alertAdd.selectedAlertTypeTitle"
                values={{ alertType: alertType ? alertType.name : '' }}
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
          setAlertProperty={setAlertProperty}
          hasErrors={hasErrors}
        />
      ) : null}
    </Fragment>
  );

  let alertDetails;
  if (!alertAction) {
    alertDetails = (
      <Fragment>
        <EuiTitle size="s">
          <h5 id="alertActionTypeTitle">
            <FormattedMessage
              defaultMessage={'Select an action'}
              id="xpack.alertingUI.sections.alertAdd.selectAlertActionTypeTitle"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGrid gutterSize="m" columns={3}>
          {actionTypeNodes}
        </EuiFlexGrid>
      </Fragment>
    );
  } else {
    alert.actions.push(alertAction);
    const actionTypeRegisterd = actionTypeRegistry.get(alert.actions[0].id);
    if (actionTypeRegisterd === null) return null;
    const ParamsFieldsComponent = actionTypeRegisterd.actionParamsFields;
    alertDetails = (
      <Fragment>
        <EuiTitle size="s">
          <h5 id="alertActionTypeEditTitle">
            <FormattedMessage
              defaultMessage={'Action: Name of action'}
              id="xpack.alertingUI.sections.alertAdd.selectAlertActionTypeEditTitle"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="m" />
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
    alertTypeArea = <Fragment>{alertTypeDetails}</Fragment>;
  } else {
    alertTypeArea = (
      <Fragment>
        <EuiTitle size="s">
          <h5 id="alertTypeTitle">
            <FormattedMessage
              defaultMessage={'Select a trigger'}
              id="xpack.alertingUI.sections.alertAdd.selectAlertTypeTitle"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGrid gutterSize="m" columns={3}>
          {alertTypeNodes}
        </EuiFlexGrid>
      </Fragment>
    );
  }

  const labelForAlertChecked = (
    <>
      <FormattedMessage
        id="xpack.alertingUI.sections.alertAdd.checkFieldLabel"
        defaultMessage="Check every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.alertingUI.sections.alertAdd.checkWithTooltip', {
          defaultMessage: 'This is some help text here for check alert.',
        })}
      />
    </>
  );

  const labelForAlertRenotify = (
    <>
      <FormattedMessage
        id="xpack.alertingUI.sections.alertAdd.renotifyFieldLabel"
        defaultMessage="Re-notify every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.alertingUI.sections.alertAdd.renotifyWithTooltip', {
          defaultMessage: 'This is some help text here for re-notify alert.',
        })}
      />
    </>
  );

  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={closeFlyout} aria-labelledby="flyoutAlertAddTitle" size="m">
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
            <EuiSpacer size="m" />
            <EuiFlexGrid columns={2}>
              <EuiFlexItem grow={false}>
                <EuiFormRow fullWidth compressed label={labelForAlertChecked}>
                  <EuiFlexGroup gutterSize="none">
                    <EuiFlexItem grow={false}>
                      <EuiFieldNumber
                        value={alert.checkIntervalSize || ''}
                        name="throttle"
                        data-test-subj="throttleInput"
                        onChange={e => {
                          setAlertProperty('checkIntervalSize', e.target.value);
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSelect
                        value={alert.checkIntervalUnit}
                        options={getTimeOptions(alert.checkIntervalSize)}
                        onChange={(e: any) => setAlertProperty('checkIntervalUnit', e.target.value)}
                        fullWidth={true}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow fullWidth label={labelForAlertRenotify}>
                  <EuiFlexGroup gutterSize="none">
                    <EuiFlexItem grow={false}>
                      <EuiFieldNumber
                        value={alert.throttle || ''}
                        name="throttle"
                        data-test-subj="throttleInput"
                        onChange={e => {
                          setAlertProperty('renotifyIntervalSize', e.target.value);
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSelect
                        value={alert.renotifyIntervalUnit}
                        options={getTimeOptions(alert.renotifyIntervalSize)}
                        onChange={(e: any) =>
                          setAlertProperty('renotifyIntervalUnit', e.target.value)
                        }
                        fullWidth={true}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGrid>
            <EuiSpacer size="m" />
            <EuiTabs>{alertTabs}</EuiTabs>
            <EuiSpacer size="m" />
            {alertTypeArea}
            <EuiSpacer size="xl" />
            {selectedTabContent}
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
                isDisabled={hasErrors || hasActionErrors}
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
    </EuiPortal>
  );
};
