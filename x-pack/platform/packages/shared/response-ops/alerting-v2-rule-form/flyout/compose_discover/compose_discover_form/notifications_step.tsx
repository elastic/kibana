/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import type { ComposeFormValues } from '../compose_form_types';

const notificationsTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.notifications.title',
  { defaultMessage: 'Simple action policy' }
);

const notificationsSubtext = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.notifications.subtext',
  {
    defaultMessage:
      "Send a notification when this rule's alerts change status. A linked action policy will be created with this rule.",
  }
);

interface Props {
  services: RuleFormServices;
}

export const NotificationsStep = ({ services }: Props) => {
  const { watch, setValue } = useFormContext<ComposeFormValues>();
  const notifications = watch('notifications');
  const { workflowForm } = services;
  const [touched, setTouched] = useState(false);

  const workflows = notifications?.workflows ?? workflowForm.defaultValue();
  const isWorkflowInvalid = touched && !(workflowForm.isValid?.(workflows) ?? true);

  return (
    <>
      <EuiTitle size="xs">
        <h3>{notificationsTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{notificationsSubtext}</p>
      </EuiText>
      <EuiSpacer size="m" />

      {workflowForm.supported !== false && (
        <div onBlur={() => setTouched(true)}>
          <Suspense fallback={<EuiLoadingSpinner size="m" />}>
            <workflowForm.Component
              value={workflows}
              onChange={(next) =>
                setValue('notifications', { workflows: next }, { shouldDirty: true })
              }
              isInvalid={isWorkflowInvalid}
            />
          </Suspense>
        </div>
      )}
    </>
  );
};
