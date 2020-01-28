/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useCallback, useReducer, useEffect } from 'react';
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
  EuiFieldText,
  EuiFlexGrid,
  EuiFormRow,
  EuiComboBox,
  EuiKeyPadMenuItem,
  EuiTabs,
  EuiTab,
  EuiLink,
  EuiFieldNumber,
  EuiSelect,
  EuiIconTip,
  EuiAccordion,
  EuiButtonIcon,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useAppDependencies } from '../../app_context';
import { createAlert } from '../../lib/alert_api';
import { loadActionTypes, loadAllActions } from '../../lib/action_connector_api';
import { useAlertsContext } from '../../context/alerts_context';
import { alertReducer } from './alert_reducer';
import {
  AlertTypeModel,
  Alert,
  IErrorObject,
  ActionTypeModel,
  AlertAction,
  ActionTypeIndex,
  ActionConnector,
} from '../../../types';
import { ACTION_GROUPS } from '../../constants/action_groups';
import { getTimeOptions } from '../../lib/get_time_options';
import { SectionLoading } from '../../components/section_loading';
import { ConnectorAddModal } from '../action_connector_form/connector_add_modal';

function validateBaseProperties(alertObject: Alert) {
  const validationResult = { errors: {} };
  const errors = {
    name: new Array<string>(),
    interval: new Array<string>(),
    alertTypeId: new Array<string>(),
    actionConnectors: new Array<string>(),
  };
  validationResult.errors = errors;
  if (!alertObject.name) {
    errors.name.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredNameText', {
        defaultMessage: 'Name is required.',
      })
    );
  }
  if (!alertObject.schedule.interval) {
    errors.interval.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredIntervalText', {
        defaultMessage: 'Check interval is required.',
      })
    );
  }
  if (!alertObject.alertTypeId) {
    errors.alertTypeId.push(
      i18n.translate('xpack.triggersActionsUI.sections.alertForm.error.requiredAlertTypeIdText', {
        defaultMessage: 'Alert trigger is required.',
      })
    );
  }
  return validationResult;
}

interface AlertFormProps {
  initialAlert: Alert;
  setFlyoutVisibility: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AlertForm = ({ initialAlert, setFlyoutVisibility }: AlertFormProps) => {
  const { http, toastNotifications, alertTypeRegistry, actionTypeRegistry } = useAppDependencies();

  const { reloadAlerts } = useAlertsContext();
  // hooks
  const [{ alert }, dispatch] = useReducer(alertReducer, { alert: initialAlert });

  const [alertType, setAlertType] = useState<AlertTypeModel | undefined>(undefined);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [addModalVisible, setAddModalVisibility] = useState<boolean>(false);
  const [isLoadingActionTypes, setIsLoadingActionTypes] = useState<boolean>(false);
  const [selectedTabId, setSelectedTabId] = useState<string>('alert');
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);
  const [alertInterval, setAlertInterval] = useState<number | null>(null);
  const [alertIntervalUnit, setAlertIntervalUnit] = useState<string>('m');
  const [alertThrottle, setAlertThrottle] = useState<number | null>(null);
  const [alertThrottleUnit, setAlertThrottleUnit] = useState<string>('m');
  const [serverError, setServerError] = useState<{
    body: { message: string; error: string };
  } | null>(null);
  const [isAddActionPanelOpen, setIsAddActionPanelOpen] = useState<boolean>(true);
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);

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
            'xpack.triggersActionsUI.sections.alertForm.unableToLoadActionTypesMessage',
            { defaultMessage: 'Unable to load action types' }
          ),
        });
      } finally {
        setIsLoadingActionTypes(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadConnectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setInitialAlert = (value: any) => {
    dispatch({ command: { type: 'setAlert' }, payload: { key: 'alert', value } });
  };

  const setAlertProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
  };

  const setAlertParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setAlertParams' }, payload: { key, value } });
  };

  const setScheduleProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setScheduleProperty' }, payload: { key, value } });
  };

  const setActionParamsProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionParams' }, payload: { key, value, index } });
  };

  const setActionProperty = (key: string, value: any, index: number) => {
    dispatch({ command: { type: 'setAlertActionProperty' }, payload: { key, value, index } });
  };

  const closeFlyout = useCallback(() => {
    setFlyoutVisibility(false);
    setAlertType(undefined);
    setIsAddActionPanelOpen(true);
    setSelectedTabId('alert');
    setServerError(null);
    setInitialAlert(initialAlert);
  }, [initialAlert, setFlyoutVisibility]);

  const tagsOptions = alert.tags ? alert.tags.map((label: string) => ({ label })) : [];

  async function loadConnectors() {
    try {
      const actionsResponse = await loadAllActions({ http });
      setConnectors(actionsResponse.data);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.alertForm.unableToLoadActionsMessage',
          {
            defaultMessage: 'Unable to load connectors',
          }
        ),
      });
    }
  }

  const AlertParamsExpressionComponent = alertType ? alertType.alertParamsExpression : null;

  const errors = {
    ...(alertType ? alertType.validate(alert).errors : []),
    ...validateBaseProperties(alert).errors,
  } as IErrorObject;
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  const actionsErrors = alert.actions.reduce((acc: any, alertAction: AlertAction) => {
    const actionTypeConnectors = connectors.find(field => field.id === alertAction.id);
    if (!actionTypeConnectors) {
      return { ...acc };
    }
    const actionType = actionTypeRegistry.get(actionTypeConnectors.actionTypeId);
    if (!actionType) {
      return { ...acc };
    }
    const actionValidationErrors = actionType.validateParams(alertAction.params);
    return { ...acc, [alertAction.id]: actionValidationErrors };
  }, {});

  const hasActionErrors = !!Object.entries(actionsErrors)
    .map(([, actionErrors]) => actionErrors)
    .find((actionErrors: any) => {
      return !!Object.keys(actionErrors.errors).find(
        errorKey => actionErrors.errors[errorKey].length >= 1
      );
    });

  const tabs = [
    {
      id: ACTION_GROUPS.ALERT,
      name: i18n.translate('xpack.triggersActionsUI.sections.alertForm.alertTabText', {
        defaultMessage: 'Alert',
      }),
    },
    {
      id: ACTION_GROUPS.WARNING,
      name: i18n.translate('xpack.triggersActionsUI.sections.alertForm.warningTabText', {
        defaultMessage: 'Warning',
      }),
    },
    {
      id: ACTION_GROUPS.UNACKNOWLEDGED,
      name: i18n.translate('xpack.triggersActionsUI.sections.alertForm.unacknowledgedTabText', {
        defaultMessage: 'If unacknowledged',
      }),
      disabled: false,
    },
  ];

  async function onSaveAlert(): Promise<any> {
    try {
      const newAlert = await createAlert({ http, alert });
      toastNotifications.addSuccess(
        i18n.translate('xpack.triggersActionsUI.sections.alertForm.saveSuccessNotificationText', {
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

  function addActionType(actionTypeModel: ActionTypeModel) {
    setIsAddActionPanelOpen(false);
    const actionTypeConnectors = connectors.filter(
      field => field.actionTypeId === actionTypeModel.id
    );
    let isActionExists = false;
    if (actionTypeConnectors.length > 0) {
      // Should we allow adding multiple actions to the same connector under the alert?
      isActionExists = alert.actions.find(
        (action: AlertAction) => action.id === actionTypeConnectors[0].id
      );
      if (!isActionExists) {
        alert.actions.push({
          id: actionTypeConnectors[0].id,
          group: selectedTabId,
          params: {},
        });
      }
    }
    if (actionTypeConnectors.length === 0 || isActionExists) {
      // if no connectors exists or all connectors is already assigned an action under current alert
      // set actionType as id to be able to create new connector within the alert form
      alert.actions.push({
        id: `${actionTypeModel.id}^${alert.actions.length}`,
        group: selectedTabId,
        params: {},
      });
    }
  }

  const alertTypeNodes = alertTypeRegistry.list().map(function(item, index) {
    return (
      <EuiKeyPadMenuItem
        key={index}
        data-test-subj="alertTypeSelectOption"
        label={item.name}
        onClick={() => {
          setAlertProperty('alertTypeId', item.id);
          setAlertType(item);
        }}
      >
        <EuiIcon size="xl" type={item.iconClass} />
      </EuiKeyPadMenuItem>
    );
  });

  const actionTypeNodes = actionTypeRegistry.list().map(function(item, index) {
    return (
      <EuiKeyPadMenuItem
        key={index}
        data-test-subj="actionTypeSelectOption"
        label={actionTypesIndex ? actionTypesIndex[item.id].name : item.id}
        onClick={() => addActionType(item)}
      >
        <EuiIcon size="xl" type={item.iconClass} />
      </EuiKeyPadMenuItem>
    );
  });

  const alertTabs = tabs.map(function(tab, index): any {
    return (
      <EuiTab
        onClick={() => {
          setSelectedTabId(tab.id);
          if (!alert.actions.find((action: AlertAction) => action.group === tab.id)) {
            setIsAddActionPanelOpen(true);
          } else {
            setIsAddActionPanelOpen(false);
          }
        }}
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
                defaultMessage="Trigger: {alertType}"
                id="xpack.triggersActionsUI.sections.alertForm.selectedAlertTypeTitle"
                values={{ alertType: alertType ? alertType.name : '' }}
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={() => {
              setAlertProperty('alertTypeId', null);
              setAlertType(undefined);
            }}
          >
            <FormattedMessage
              defaultMessage="Change"
              id="xpack.triggersActionsUI.sections.alertForm.changeAlertTypeLink"
            />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      {AlertParamsExpressionComponent ? (
        <AlertParamsExpressionComponent
          alert={alert}
          errors={errors}
          setAlertParams={setAlertParams}
          setAlertProperty={setAlertProperty}
        />
      ) : null}
    </Fragment>
  );

  const getSelectedOptions = (actionItemId: string) => {
    const val = connectors.find(connector => connector.id === actionItemId);
    if (!val) {
      return [];
    }
    return [
      {
        label: val.name,
        value: val.name,
        id: actionItemId,
      },
    ];
  };

  const getActionTypeForm = (
    actionItem: AlertAction,
    actionConnector: ActionConnector,
    index: number
  ) => {
    const optionsList = connectors
      .filter(
        field =>
          field.actionTypeId === actionConnector.actionTypeId &&
          !alert.actions.find(
            (existingAction: AlertAction) => existingAction.id === field.actionTypeId
          )
      )
      .map(({ name, id }) => ({
        label: name,
        key: id,
        id,
      }));
    const actionTypeRegisterd = actionTypeRegistry.get(actionConnector.actionTypeId);
    if (actionTypeRegisterd === null || actionItem.group !== selectedTabId) return null;
    const ParamsFieldsComponent = actionTypeRegisterd.actionParamsFields;
    const actionParamsErrors =
      Object.keys(actionsErrors).length > 0 ? actionsErrors[actionItem.id] : [];

    return (
      <EuiAccordion
        initialIsOpen={true}
        key={index}
        id={index.toString()}
        className="euiAccordionForm"
        buttonContentClassName="euiAccordionForm__button"
        data-test-subj="alertActionAccordion"
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeRegisterd.iconClass} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h5>
                  <FormattedMessage
                    defaultMessage="Action: {actionConnectorName}"
                    id="xpack.triggersActionsUI.sections.alertForm.selectAlertActionTypeEditTitle"
                    values={{
                      actionConnectorName: actionConnector.name,
                    }}
                  />
                </h5>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        extraAction={
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            className="euiAccordionForm__extraAction"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.alertForm.accordion.deleteIconAriaLabel',
              {
                defaultMessage: 'Delete',
              }
            )}
            onClick={() => {
              const updatedActions = alert.actions.filter(
                (item: AlertAction) => item.id !== actionItem.id
              );
              setAlertProperty('actions', updatedActions);
            }}
          />
        }
        paddingSize="l"
      >
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertForm.actionIdLabel"
              defaultMessage="{connectorInstance} instance"
              values={{
                connectorInstance: actionTypesIndex
                  ? actionTypesIndex[actionConnector.actionTypeId].name
                  : actionConnector.actionTypeId,
              }}
            />
          }
        >
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            options={optionsList}
            selectedOptions={getSelectedOptions(actionItem.id)}
            onChange={selectedOptions => {
              setActionProperty('id', selectedOptions[0].id, index);
            }}
            isClearable={false}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        {ParamsFieldsComponent ? (
          <ParamsFieldsComponent
            action={actionItem.params}
            index={index}
            errors={actionParamsErrors.errors}
            editAction={setActionParamsProperty}
          />
        ) : null}
      </EuiAccordion>
    );
  };

  const getAddConnectorsForm = (actionItem: AlertAction, index: number) => {
    const actionTypeIdFrom = actionItem.id.split('^')[0];
    const actionTypeName = actionTypesIndex
      ? actionTypesIndex[actionTypeIdFrom].name
      : actionTypeIdFrom;
    const actionTypeRegisterd = actionTypeRegistry.get(actionTypeIdFrom);
    if (actionTypeRegisterd === null || actionItem.group !== selectedTabId) return null;
    return (
      <EuiAccordion
        initialIsOpen={true}
        key={index}
        id={index.toString()}
        className="euiAccordionForm"
        buttonContentClassName="euiAccordionForm__button"
        data-test-subj="alertActionAccordion"
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeRegisterd.iconClass} size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h5>
                  <FormattedMessage
                    defaultMessage="Action: {actionConnectorName}"
                    id="xpack.triggersActionsUI.sections.alertForm.selectAlertActionTypeEditTitle"
                    values={{
                      actionConnectorName: actionTypeRegisterd.actionTypeTitle,
                    }}
                  />
                </h5>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        extraAction={
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            className="euiAccordionForm__extraAction"
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.sections.alertForm.accordion.deleteIconAriaLabel',
              {
                defaultMessage: 'Delete',
              }
            )}
            onClick={() => {
              const updatedActions = alert.actions.filter(
                (item: AlertAction) => item.id !== actionItem.id
              );
              setAlertProperty('actions', updatedActions);
            }}
          />
        }
        paddingSize="l"
      >
        <EuiEmptyPrompt
          title={
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertForm.emptyConnectorsLabel"
              defaultMessage="There are no {actionTypeName} connectors"
              values={{
                actionTypeName,
              }}
            />
          }
          actions={[
            <EuiButton
              color="primary"
              fill
              data-test-subj="createActionConnectorButton"
              onClick={() => {
                setAddModalVisibility(true);
              }}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertForm.addConnectorButtonLabel"
                defaultMessage="Add {actionTypeName} connector"
                values={{
                  actionTypeName,
                }}
              />
            </EuiButton>,
          ]}
        />
        {actionTypesIndex ? (
          <ConnectorAddModal
            key={index}
            actionType={actionTypesIndex[actionTypeIdFrom]}
            addModalVisible={addModalVisible}
            setAddModalVisibility={setAddModalVisibility}
          />
        ) : null}
      </EuiAccordion>
    );
  };

  const actionsListForGroup = (
    <Fragment>
      {alert.actions.map((actionItem: AlertAction, index: number) => {
        const actionConnector = connectors.find(field => field.id === actionItem.id);
        // connectors doesn't exists
        if (!actionConnector) {
          return getAddConnectorsForm(actionItem, index);
        }
        return getActionTypeForm(actionItem, actionConnector, index);
      })}
      <EuiSpacer size="m" />
      {!isAddActionPanelOpen ? (
        <EuiButton
          iconType="plusInCircle"
          data-test-subj="addAlertActionButton"
          onClick={() => setIsAddActionPanelOpen(true)}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertForm.addActionButtonLabel"
            defaultMessage="Add action"
          />
        </EuiButton>
      ) : null}
    </Fragment>
  );

  let alertTypeArea;
  if (alertType) {
    alertTypeArea = <Fragment>{alertTypeDetails}</Fragment>;
  } else {
    alertTypeArea = (
      <Fragment>
        <EuiTitle size="s">
          <h5 id="alertTypeTitle">
            <FormattedMessage
              defaultMessage="Select a trigger"
              id="xpack.triggersActionsUI.sections.alertForm.selectAlertTypeTitle"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer />
        <EuiFlexGroup gutterSize="s" wrap>
          {alertTypeNodes}
        </EuiFlexGroup>
      </Fragment>
    );
  }

  const labelForAlertChecked = (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.alertForm.checkFieldLabel"
        defaultMessage="Check every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.triggersActionsUI.sections.alertForm.checkWithTooltip', {
          defaultMessage: 'This is some help text here for check alert.',
        })}
      />
    </>
  );

  const labelForAlertRenotify = (
    <>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.alertForm.renotifyFieldLabel"
        defaultMessage="Re-notify every"
      />{' '}
      <EuiIconTip
        position="right"
        type="questionInCircle"
        content={i18n.translate('xpack.triggersActionsUI.sections.alertForm.renotifyWithTooltip', {
          defaultMessage: 'This is some help text here for re-notify alert.',
        })}
      />
    </>
  );

  return (
    <Fragment>
      <EuiFlyoutBody>
        <EuiForm isInvalid={serverError !== null} error={serverError?.body.message}>
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                id="alertName"
                label={
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.alertForm.alertNameLabel"
                    defaultMessage="Name"
                  />
                }
                isInvalid={errors.name.length > 0 && alert.name !== undefined}
                error={errors.name}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={errors.name.length > 0 && alert.name !== undefined}
                  compressed
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
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.actionAdd.indexAction.indexTextFieldLabel',
                  {
                    defaultMessage: 'Tags (optional)',
                  }
                )}
              >
                <EuiComboBox
                  noSuggestions
                  fullWidth
                  compressed
                  data-test-subj="tagsComboBox"
                  selectedOptions={tagsOptions}
                  onCreateOption={(searchValue: string) => {
                    const newOptions = [...tagsOptions, { label: searchValue }];
                    setAlertProperty(
                      'tags',
                      newOptions.map(newOption => newOption.label)
                    );
                  }}
                  onChange={(selectedOptions: Array<{ label: string }>) => {
                    setAlertProperty(
                      'tags',
                      selectedOptions.map(selectedOption => selectedOption.label)
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
            <EuiFlexItem>
              <EuiFormRow fullWidth compressed label={labelForAlertChecked}>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem>
                    <EuiFieldNumber
                      fullWidth
                      min={1}
                      compressed
                      value={alertInterval || 1}
                      name="interval"
                      data-test-subj="intervalInput"
                      onChange={e => {
                        const interval =
                          e.target.value !== '' ? parseInt(e.target.value, 10) : null;
                        setAlertInterval(interval);
                        setScheduleProperty('interval', `${e.target.value}${alertIntervalUnit}`);
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      fullWidth
                      compressed
                      value={alertIntervalUnit}
                      options={getTimeOptions((alertInterval ? alertInterval : 1).toString())}
                      onChange={(e: any) => {
                        setAlertIntervalUnit(e.target.value);
                        setScheduleProperty('interval', `${alertInterval}${e.target.value}`);
                      }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow fullWidth label={labelForAlertRenotify}>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem>
                    <EuiFieldNumber
                      fullWidth
                      min={1}
                      compressed
                      value={alertThrottle || ''}
                      name="throttle"
                      data-test-subj="throttleInput"
                      onChange={e => {
                        const throttle =
                          e.target.value !== '' ? parseInt(e.target.value, 10) : null;
                        setAlertThrottle(throttle);
                        setAlertProperty('throttle', `${e.target.value}${alertThrottleUnit}`);
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      compressed
                      value={alertThrottleUnit}
                      options={getTimeOptions((alertThrottle ? alertThrottle : 1).toString())}
                      onChange={(e: any) => {
                        setAlertThrottleUnit(e.target.value);
                        setAlertProperty('throttle', `${alertThrottle}${e.target.value}`);
                      }}
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
          {actionsListForGroup}
          {isAddActionPanelOpen ? (
            <Fragment>
              <EuiTitle size="s">
                <h5 id="alertActionTypeTitle">
                  <FormattedMessage
                    defaultMessage="Select an action"
                    id="xpack.triggersActionsUI.sections.alertForm.selectAlertActionTypeTitle"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer />
              <EuiFlexGroup gutterSize="s" wrap>
                {isLoadingActionTypes ? (
                  <SectionLoading>
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.alertForm.loadingActionTypesDescription"
                      defaultMessage="Loading action types…"
                    />
                  </SectionLoading>
                ) : (
                  actionTypeNodes
                )}
              </EuiFlexGroup>
            </Fragment>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>
              {i18n.translate('xpack.triggersActionsUI.sections.alertForm.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="secondary"
              data-test-subj="saveAlertButton"
              type="submit"
              iconType="check"
              isDisabled={hasErrors || hasActionErrors}
              isLoading={isSaving}
              onClick={async () => {
                setIsSaving(true);
                const savedAlert = await onSaveAlert();
                setIsSaving(false);
                if (savedAlert && savedAlert.error) {
                  return setServerError(savedAlert.error);
                }
                closeFlyout();
                reloadAlerts();
              }}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.alertForm.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};
