/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLoadingSpinner, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import type { FormValues } from '../../../form/types';

const notificationsDescription = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.notifications.description',
  {
    defaultMessage:
      "Send a notification when this rule's alerts change status. A linked action policy will be created with this rule.",
  }
);

const notificationsEnableLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.notifications.enableToggleLabel',
  { defaultMessage: 'Enable notifications' }
);

const notificationsCalloutTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.notifications.calloutTitle',
  { defaultMessage: 'Need more control?' }
);

const notificationsCalloutBody = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.notifications.calloutBody',
  {
    defaultMessage:
      'You can refine this policy later by adding matchers, grouping fields, or adjusting the throttle interval.',
  }
);

interface NotificationsStepProps {
  services: RuleFormServices;
}

export const NotificationsStep: React.FC<NotificationsStepProps> = ({ services }) => {
  const { watch, setValue } = useFormContext<FormValues>();
  const notifications = watch('notifications');
  const enabled = !!notifications;
  const { workflowForm } = services;

  const handleToggle = useCallback(() => {
    if (enabled) {
      setValue('notifications', undefined, { shouldDirty: true });
    } else {
      setValue('notifications', { workflow: workflowForm.defaultValue() }, { shouldDirty: true });
    }
  }, [enabled, setValue, workflowForm]);

  return (
    <>
      <EuiText size="s" color="subdued">
        <p>{notificationsDescription}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiSwitch
        label={notificationsEnableLabel}
        checked={enabled}
        onChange={handleToggle}
        data-test-subj="notificationsEnableToggle"
      />

      {enabled && (
        <>
          <EuiSpacer size="m" />
          <Suspense fallback={<EuiLoadingSpinner size="m" />}>
            <workflowForm.Component
              value={notifications!.workflow}
              onChange={(next) =>
                setValue('notifications', { workflow: next }, { shouldDirty: true })
              }
            />
          </Suspense>
        </>
      )}

      <EuiSpacer size="m" />
      <EuiCallOut
        size="s"
        color="primary"
        iconType="info"
        title={notificationsCalloutTitle}
        data-test-subj="notificationsMoreControlCallout"
      >
        <p>{notificationsCalloutBody}</p>
      </EuiCallOut>
    </>
  );
};
