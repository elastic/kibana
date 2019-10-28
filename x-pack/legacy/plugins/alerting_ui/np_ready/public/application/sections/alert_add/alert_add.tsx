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
} from '@elastic/eui';
import { useAppDependencies } from '../..';
import { saveAlert } from '../../lib/api';
import { AlertsContext } from '../../context/alerts_context';
import { alertReducer } from './alert_reducer';
import { ErrableFormRow } from '../../components/page_error';
import { AlertTypeModel } from '../../../types';

interface Props {
  refreshList: () => Promise<void>;
}

export const AlertAdd = ({ refreshList }: Props) => {
  const {
    core: { http },
    plugins: { toastNotifications },
    alertTypeRegistry,
  } = useAppDependencies();
  const { alertFlyoutVisible, setAlertFlyoutVisibility } = useContext(AlertsContext);
  // hooks
  const [{ alert }, dispatch] = useReducer(alertReducer, {
    alert: {
      validate: () => {
        return { errors: {} };
      },
      alertTypeParams: {},
    },
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedTabId, setSelectedTabId] = useState<string>('alert');
  const [alertType, setAlertType] = useState<AlertTypeModel | undefined>(undefined);
  const getAlert = () => {
    dispatch({
      command: 'setAlert',
      payload: {
        validate: () => {
          return { errors: {} };
        },
        alertTypeParams: {},
        alertTypeId: alertType ? alertType.id : null,
        actions: [],
      },
    });
  };

  useEffect(() => {
    getAlert();
  }, [alertType]);

  const closeFlyout = useCallback(() => setAlertFlyoutVisibility(false), []);

  const setAlertProperty = (property: string, value: any) => {
    dispatch({ command: 'setProperty', payload: { property, value } });
  };

  const setAlertTypeParams = (property: string, value: any) => {
    dispatch({ command: 'setAlertTypeParams', payload: { property, value } });
  };

  if (!alertFlyoutVisible) {
    return null;
  }
  const tagsOptions = []; // TODO: move to alert instande when the server side will be done
  const AlertTypeParamsExpressionComponent = alertType ? alertType.alertTypeParamsExpression : null;

  const { errors } = alert.validate(); // TODO: decide how beter define the Alert UI validation
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  // TODO: define constants for the action groups
  const tabs = [
    {
      id: 'alert',
      name: 'Alert',
    },
    {
      id: 'warning',
      name: 'Warning',
    },
    {
      id: 'escalation',
      name: 'Escalation',
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

  const alertDetails = (
    <Fragment>
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
        ></AlertTypeParamsExpressionComponent>
      ) : null}
    </Fragment>
  );

  const warningDetails = <Fragment>Warning</Fragment>;

  const escalationDetails = <Fragment>Escalation</Fragment>;

  let selectedTabContent;
  switch (selectedTabId) {
    case 'alert':
      selectedTabContent = alertDetails;
      break;
    case 'warning':
      selectedTabContent = warningDetails;
      break;
    case 'escalation':
      selectedTabContent = escalationDetails;
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
        {selectedTabContent}
      </Fragment>
    );
  } else {
    alertTypeArea = (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h5 id="alertTypeTitle">
            <FormattedMessage
              defaultMessage={'Select type'}
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
                    defaultMessage: 'Tags',
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
                    setAlertProperty('tags', selected.map(aSelected => aSelected.value));
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
            <EuiButtonEmpty onClick={() => setAlertFlyoutVisibility(false)}>
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
