/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { omit, pick } from 'lodash';
import { kfetch } from 'ui/kfetch';
import {
  EuiSteps,
  EuiSpacer,
  EuiText,
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionResult } from '../../../../actions/server/types';
import { ALERT_ACTION_TYPE_EMAIL } from '../../../common/constants';
import { toggleSetupMode } from '../../lib/setup_mode';
import { EmailActionData, ManageEmailAction } from './manage_email_action';
import { getMissingFieldErrors } from '../../lib/form_validation';

export interface AlertsConfigurationProps {
  clusterUuid: string;
  emailAddress: string;
  onDone: Function;
}

interface AlertsConfigurationForm {
  email: string | null;
}

const NEW_ACTION_ID = '__new__';

export const AlertsConfiguration: React.FC<AlertsConfigurationProps> = (
  props: AlertsConfigurationProps
) => {
  const { clusterUuid, onDone } = props;

  const [emailActions, setEmailActions] = React.useState<ActionResult[]>([]);
  const [editAction, setEditAction] = React.useState<ActionResult | null>(null);
  const [selectedEmailActionId, setSelectedEmailActionId] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState(props.emailAddress);
  const [formErrors, setFormErrors] = React.useState<AlertsConfigurationForm>({ email: null });
  const [showFormErrors, setShowFormErrors] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [testingStatus, setTestingStatus] = React.useState<string | boolean | null>(null);

  React.useEffect(() => {
    async function fetchData() {
      await fetchEmailActions();
      await toggleSetupMode(true);
    }

    fetchData();
  }, [clusterUuid]);

  React.useEffect(() => {
    setFormErrors(getMissingFieldErrors({ email: emailAddress }, { email: '' }));
  }, [emailAddress]);

  async function fetchEmailActions() {
    const kibanaActions = await kfetch({
      method: 'GET',
      pathname: `/api/action/_find`,
    });

    const actions = kibanaActions.data.filter(
      (action: ActionResult) => action.actionTypeId === ALERT_ACTION_TYPE_EMAIL
    );
    if (actions.length > 0) {
      setSelectedEmailActionId(actions[0].id);
    } else {
      setSelectedEmailActionId(NEW_ACTION_ID);
    }
    setEmailActions(actions);
  }

  async function createEmailAction(data: EmailActionData) {
    if (editAction) {
      await kfetch({
        method: 'PUT',
        pathname: `/api/action/${editAction.id}`,
        body: JSON.stringify({
          description: editAction.description,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password']),
        }),
      });
      setEditAction(null);
    } else {
      await kfetch({
        method: 'POST',
        pathname: '/api/action',
        body: JSON.stringify({
          description: i18n.translate(
            'xpack.monitoring.alerts.configuration.emailAction.description',
            {
              defaultMessage: 'Kibana alerting is up to date!',
            }
          ),
          actionTypeId: ALERT_ACTION_TYPE_EMAIL,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password']),
        }),
      });
    }

    await fetchEmailActions();
  }

  async function deleteEmailAction(id: string) {
    setIsDeleting(true);

    await kfetch({
      method: 'DELETE',
      pathname: `/api/action/${id}`,
    });

    if (editAction && editAction.id === id) {
      setEditAction(null);
    }
    if (selectedEmailActionId === id) {
      setSelectedEmailActionId('');
    }
    await fetchEmailActions();
    setIsDeleting(false);
    setTestingStatus(null);
  }

  async function save() {
    if (emailAddress.length === 0) {
      setShowFormErrors(true);
      return;
    }
    setIsSaving(true);
    setShowFormErrors(false);

    await kfetch({
      method: 'POST',
      pathname: `/api/monitoring/v1/clusters/${clusterUuid}/alerts`,
      body: JSON.stringify({ selectedEmailActionId, emailAddress }),
    });

    onDone();
  }

  async function testEmailAction() {
    setIsTesting(true);
    setTestingStatus(null);

    const params = {
      subject: 'Kibana alerting test configuration',
      message: `This is a test for the configured email action for Kibana alerting.`,
      to: [emailAddress],
    };

    const result = await kfetch({
      method: 'POST',
      pathname: `/api/action/${selectedEmailActionId}/_execute`,
      body: JSON.stringify({ params }),
    });
    if (result.status === 'ok') {
      setTestingStatus(true);
    } else {
      setTestingStatus(result.message);
    }
    setIsTesting(false);
  }

  function getStep1() {
    const title = i18n.translate('xpack.monitoring.alerts.configuration.selectEmailAction', {
      defaultMessage: 'Select email action',
    });

    if (editAction) {
      return {
        title,
        children: (
          <Fragment>
            <EuiText>
              <p>
                {i18n.translate('xpack.monitoring.alerts.configuration.step2.noActions', {
                  defaultMessage: 'Edit the action below.',
                })}
              </p>
            </EuiText>
            <EuiSpacer />
            <ManageEmailAction
              createEmailAction={async (data: EmailActionData) => await createEmailAction(data)}
              cancel={() => setEditAction(null)}
              isNew={false}
              action={editAction}
            />
          </Fragment>
        ),
        status: 'incomplete' as const,
      };
    }

    const options = [
      ...emailActions.map(action => {
        const actionLabel = i18n.translate(
          'xpack.monitoring.alerts.configuration.selectAction.inputDisplay',
          {
            defaultMessage: 'From: {from}, Service: {service}',
            values: {
              service: action.config.service,
              from: action.config.from,
            },
          }
        );

        return {
          value: action.id,
          inputDisplay: <EuiText>{actionLabel}</EuiText>,
          dropdownDisplay: <EuiText>{actionLabel}</EuiText>,
        };
      }),
      {
        value: NEW_ACTION_ID,
        inputDisplay: (
          <EuiText>
            {i18n.translate('xpack.monitoring.alerts.configuration.newActionInputDisplay', {
              defaultMessage: 'Configure a new email action service',
            })}
          </EuiText>
        ),
        dropdownDisplay: (
          <EuiText>
            {i18n.translate('xpack.monitoring.alerts.configuration.newActionDropdownDisplay', {
              defaultMessage: 'Create new email action...',
            })}
          </EuiText>
        ),
      },
    ];

    let createNew = null;
    if (selectedEmailActionId === NEW_ACTION_ID) {
      createNew = (
        <Fragment>
          <EuiSpacer />
          <EuiPanel>
            <ManageEmailAction
              createEmailAction={async (data: EmailActionData) => await createEmailAction(data)}
              isNew={true}
            />
          </EuiPanel>
        </Fragment>
      );
    }

    let manageConfiguration = null;
    const selectedEmailAction = emailActions.find(action => action.id === selectedEmailActionId);
    if (selectedEmailActionId !== NEW_ACTION_ID && selectedEmailActionId && selectedEmailAction) {
      let testingStatusUi = null;
      if (testingStatus === true) {
        testingStatusUi = (
          <Fragment>
            <EuiSpacer />
            <EuiText color="secondary">
              <p>
                {i18n.translate('xpack.monitoring.alerts.configuration.testConfiguration.success', {
                  defaultMessage: 'Looks good on our end!',
                })}
              </p>
            </EuiText>
          </Fragment>
        );
      } else if (testingStatus !== null) {
        testingStatusUi = (
          <Fragment>
            <EuiSpacer />
            <EuiText color="danger">
              <p>
                {i18n.translate('xpack.monitoring.alerts.configuration.testConfiguration.error', {
                  defaultMessage: 'Uh oh, something went wrong. Error: {error}',
                  values: {
                    error: testingStatus,
                  },
                })}
              </p>
            </EuiText>
          </Fragment>
        );
      }

      manageConfiguration = (
        <Fragment>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="pencil"
                onClick={() => setEditAction(selectedEmailAction)}
              >
                {i18n.translate(
                  'xpack.monitoring.alerts.configuration.editConfiguration.buttonText',
                  {
                    defaultMessage: 'Edit',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" iconType="play" onClick={testEmailAction} isLoading={isTesting}>
                {i18n.translate(
                  'xpack.monitoring.alerts.configuration.testConfiguration.buttonText',
                  {
                    defaultMessage: 'Test',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="cross"
                onClick={() => deleteEmailAction(selectedEmailActionId)}
                isLoading={isDeleting}
              >
                {i18n.translate(
                  'xpack.monitoring.alerts.configuration.deleteConfiguration.buttonText',
                  {
                    defaultMessage: 'Delete',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {testingStatusUi}
        </Fragment>
      );
    }

    return {
      title,
      children: (
        <Fragment>
          <EuiSuperSelect
            options={options}
            valueOfSelected={selectedEmailActionId}
            onChange={id => setSelectedEmailActionId(id)}
            hasDividers
          />
          {manageConfiguration}
          {createNew}
        </Fragment>
      ),
      status: selectedEmailActionId ? ('complete' as const) : ('incomplete' as const),
    };
  }

  function getStep2Status(isDisabled: boolean) {
    if (isDisabled) {
      return 'disabled' as const;
    }

    if (emailAddress && emailAddress.length) {
      return 'complete' as const;
    }

    return (status = 'incomplete' as const);
  }

  function getStep2() {
    const isDisabled =
      !!editAction || !selectedEmailActionId || selectedEmailActionId === NEW_ACTION_ID;

    return {
      title: i18n.translate('xpack.monitoring.alerts.configuration.setEmailAddress', {
        defaultMessage: 'Set the email to receive alerts',
      }),
      status: getStep2Status(isDisabled),
      children: (
        <Fragment>
          <EuiForm isInvalid={showFormErrors}>
            <EuiFormRow
              label={i18n.translate('xpack.monitoring.alerts.configuration.emailAddressLabel', {
                defaultMessage: 'Email address',
              })}
              error={formErrors.email}
              isInvalid={showFormErrors && !!formErrors.email}
            >
              <EuiFieldText
                value={emailAddress}
                disabled={isDisabled}
                onChange={e => setEmailAddress(e.target.value)}
              />
            </EuiFormRow>
          </EuiForm>
        </Fragment>
      ),
    };
  }

  function getStep3() {
    const isDisabled =
      !!editAction || !selectedEmailActionId || selectedEmailActionId === NEW_ACTION_ID;

    return {
      title: i18n.translate('xpack.monitoring.alerts.configuration.confirm', {
        defaultMessage: 'Confirm and save',
      }),
      status: getStep2Status(isDisabled),
      children: (
        <Fragment>
          <EuiButton isLoading={isSaving} isDisabled={isDisabled} onClick={save}>
            {i18n.translate('xpack.monitoring.alerts.configuration.save', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </Fragment>
      ),
    };
  }

  const steps = [getStep1(), getStep2(), getStep3()];

  return (
    <div>
      <EuiSteps steps={steps} />
    </div>
  );
};
