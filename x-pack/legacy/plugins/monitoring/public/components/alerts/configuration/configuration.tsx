/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { kfetch } from 'ui/kfetch';
import { EuiSteps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionResult } from '../../../../../actions/server/types';
import { ALERT_ACTION_TYPE_EMAIL } from '../../../../common/constants';
import { getMissingFieldErrors } from '../../../lib/form_validation';
import { Step1 } from './step1';
import { Step2 } from './step2';
import { Step3 } from './step3';

export interface AlertsConfigurationProps {
  emailAddress: string;
  onDone: Function;
}

export interface StepResult {
  title: string;
  children: ReactNode;
  status: any;
}

export interface AlertsConfigurationForm {
  email: string | null;
}

export const NEW_ACTION_ID = '__new__';

export const AlertsConfiguration: React.FC<AlertsConfigurationProps> = (
  props: AlertsConfigurationProps
) => {
  const { onDone } = props;

  const [emailActions, setEmailActions] = React.useState<ActionResult[]>([]);
  const [selectedEmailActionId, setSelectedEmailActionId] = React.useState('');
  const [editAction, setEditAction] = React.useState<ActionResult | null>(null);
  const [emailAddress, setEmailAddress] = React.useState(props.emailAddress);
  const [formErrors, setFormErrors] = React.useState<AlertsConfigurationForm>({ email: null });
  const [showFormErrors, setShowFormErrors] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');

  React.useEffect(() => {
    async function fetchData() {
      await fetchEmailActions();
    }

    fetchData();
  }, []);

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

  async function save() {
    if (emailAddress.length === 0) {
      setShowFormErrors(true);
      return;
    }
    setIsSaving(true);
    setShowFormErrors(false);

    try {
      await kfetch({
        method: 'POST',
        pathname: `/api/monitoring/v1/alerts`,
        body: JSON.stringify({ selectedEmailActionId, emailAddress }),
      });
    } catch (err) {
      setIsSaving(false);
      setSaveError(err.body.message);
      return;
    }

    onDone();
  }

  function isStep2Disabled() {
    return isStep2AndStep3Disabled();
  }

  function isStep3Disabled() {
    return isStep2AndStep3Disabled() || !emailAddress || emailAddress.length === 0;
  }

  function isStep2AndStep3Disabled() {
    return !!editAction || !selectedEmailActionId || selectedEmailActionId === NEW_ACTION_ID;
  }

  function getStep2Status() {
    const isDisabled = isStep2AndStep3Disabled();

    if (isDisabled) {
      return 'disabled' as const;
    }

    if (emailAddress && emailAddress.length) {
      return 'complete' as const;
    }

    return 'incomplete' as const;
  }

  function getStep1Status() {
    if (editAction) {
      return 'incomplete' as const;
    }

    return selectedEmailActionId ? ('complete' as const) : ('incomplete' as const);
  }

  const steps = [
    {
      title: emailActions.length
        ? i18n.translate('xpack.monitoring.alerts.configuration.selectEmailAction', {
            defaultMessage: 'Select email action',
          })
        : i18n.translate('xpack.monitoring.alerts.configuration.createEmailAction', {
            defaultMessage: 'Create email action',
          }),
      children: (
        <Step1
          onActionDone={async () => await fetchEmailActions()}
          emailActions={emailActions}
          selectedEmailActionId={selectedEmailActionId}
          setSelectedEmailActionId={setSelectedEmailActionId}
          emailAddress={emailAddress}
          editAction={editAction}
          setEditAction={setEditAction}
        />
      ),
      status: getStep1Status(),
    },
    {
      title: i18n.translate('xpack.monitoring.alerts.configuration.setEmailAddress', {
        defaultMessage: 'Set the email to receive alerts',
      }),
      status: getStep2Status(),
      children: (
        <Step2
          emailAddress={emailAddress}
          setEmailAddress={setEmailAddress}
          showFormErrors={showFormErrors}
          formErrors={formErrors}
          isDisabled={isStep2Disabled()}
        />
      ),
    },
    {
      title: i18n.translate('xpack.monitoring.alerts.configuration.confirm', {
        defaultMessage: 'Confirm and save',
      }),
      status: getStep2Status(),
      children: (
        <Step3 isSaving={isSaving} save={save} isDisabled={isStep3Disabled()} error={saveError} />
      ),
    },
  ];

  return (
    <div>
      <EuiSteps steps={steps} />
    </div>
  );
};
