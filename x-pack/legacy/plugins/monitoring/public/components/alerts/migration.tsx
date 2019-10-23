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
  EuiIcon,
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

interface MigrationProps {
  clusterUuid: string;
  emailAddress: string;
  onDone: Function;
}

interface MigrationForm {
  email: string | null;
}

const NEW_ACTION_ID = '__new__';

export const Migration: React.FC<MigrationProps> = (props: MigrationProps) => {
  const { clusterUuid, onDone } = props;

  const [emailActions, setEmailActions] = React.useState<ActionResult[]>([]);
  const [editAction, setEditAction] = React.useState<ActionResult | null>(null);
  const [selectedEmailActionId, setSelectedEmailActionId] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState(props.emailAddress);
  const [formErrors, setFormErrors] = React.useState<MigrationForm>({ email: null });
  const [showFormErrors, setShowFormErrors] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    async function fetchMigrationStatus() {
      await fetchEmailActions();
      await toggleSetupMode(true);
    }

    fetchMigrationStatus();
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
    } else {
      await kfetch({
        method: 'POST',
        pathname: '/api/action',
        body: JSON.stringify({
          description: i18n.translate('xpack.monitoring.alerts.actions.emailAction.description', {
            defaultMessage: 'Kibana alerting is up to date!',
          }),
          actionTypeId: ALERT_ACTION_TYPE_EMAIL,
          config: omit(data, ['user', 'password']),
          secrets: pick(data, ['user', 'password']),
        }),
      });
    }

    await fetchEmailActions();
  }

  async function deleteEmailAction() {
    if (!editAction) {
      return null;
    }

    await kfetch({
      method: 'DELETE',
      pathname: `/api/action/${editAction.id}`,
    });

    setEditAction(null);
    if (selectedEmailActionId === editAction.id) {
      setSelectedEmailActionId('');
    }
    await fetchEmailActions();
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

  function getStep1() {
    const title = i18n.translate('xpack.monitoring.alerts.migration.selectEmailAction', {
      defaultMessage: 'Select email action',
    });

    if (editAction) {
      return {
        title,
        children: (
          <Fragment>
            <EuiText>
              <p>
                {i18n.translate('xpack.monitoring.alerts.migration.step2.noActions', {
                  defaultMessage: 'Edit the action below.',
                })}
              </p>
            </EuiText>
            <EuiSpacer />
            <ManageEmailAction
              createEmailAction={async (data: EmailActionData) => await createEmailAction(data)}
              deleteEmailAction={deleteEmailAction}
              cancel={() => setEditAction(null)}
              isNew={false}
              action={editAction}
            />
          </Fragment>
        ),
        status: 'incomplete',
      };
    }

    const options = [
      ...emailActions.map(action => {
        const actionLabel = i18n.translate(
          'xpack.monitoring.alerts.migrate.selectAction.inputDisplay',
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
          dropdownDisplay: (
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiText>{actionLabel}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="documentEdit" onClick={() => setEditAction(action)} />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        };
      }),
      {
        value: NEW_ACTION_ID,
        inputDisplay: (
          <EuiText>
            {i18n.translate('xpack.monitoring.alerts.migration.newActionInputDisplay', {
              defaultMessage: 'Creating new action...',
            })}
          </EuiText>
        ),
        dropdownDisplay: (
          <EuiText>
            {i18n.translate('xpack.monitoring.alerts.migration.newActionDropdownDisplay', {
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
              deleteEmailAction={deleteEmailAction}
              isNew={true}
            />
          </EuiPanel>
        </Fragment>
      );
    }

    return {
      title,
      children: (
        <div style={{ width: 500 }}>
          <EuiSuperSelect
            fullWidth
            options={options}
            valueOfSelected={selectedEmailActionId}
            onChange={id => setSelectedEmailActionId(id)}
            hasDividers
          />
          {createNew}
        </div>
      ),
      status: selectedEmailActionId ? 'complete' : 'incomplete',
    };
  }

  function getStep2() {
    const isDisabled = !!editAction || !selectedEmailActionId;
    return {
      title: i18n.translate('xpack.monitoring.alerts.migration.setEmailAddress', {
        defaultMessage: 'Set the email to receive alerts',
      }),
      status: isDisabled ? 'disabled' : 'incomplete',
      children: (
        <Fragment>
          <EuiForm isInvalid={showFormErrors}>
            <EuiFormRow
              label={i18n.translate('xpack.monitoring.alerts.migration.emailAddressLabel', {
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
    const isDisabled = !!editAction || !selectedEmailActionId;
    return {
      title: i18n.translate('xpack.monitoring.alerts.migration.setEmailAddress', {
        defaultMessage: 'Confirm and save',
      }),
      status: isDisabled ? 'disabled' : 'incomplete',
      children: (
        <Fragment>
          <EuiButton isLoading={isSaving} isDisabled={isDisabled} onClick={save}>
            {i18n.translate('xpack.monitoring.alerts.migration.save', {
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
