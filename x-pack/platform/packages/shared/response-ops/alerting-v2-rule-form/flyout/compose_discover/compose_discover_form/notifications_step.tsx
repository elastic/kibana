/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiLoadingSpinner, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import type { ComposeFormValues } from '../compose_form_types';

const notificationsTitle = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.notifications.title',
  { defaultMessage: 'Simple actions' }
);

const notificationsSubtext = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.notifications.subtext',
  {
    defaultMessage: "Send a notification when this rule's alerts change status.",
  }
);

const createSingleActionLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.notifications.createSingleActionLabel',
  { defaultMessage: 'Create single action' }
);

interface Props {
  services: RuleFormServices;
}

export const NotificationsStep = ({ services }: Props) => {
  const { watch, setValue } = useFormContext<ComposeFormValues>();
  const notifications = watch('notifications');
  const enabled = !!notifications;
  const { workflowForm } = services;
  const [touched, setTouched] = useState(false);
  const isWorkflowInvalid =
    touched && enabled && !(workflowForm.isValid?.(notifications!.workflow) ?? true);

  const handleCreate = useCallback(() => {
    setValue('notifications', { workflow: workflowForm.defaultValue() }, { shouldDirty: true });
  }, [setValue, workflowForm]);

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

      {enabled ? (
        <div onBlur={() => setTouched(true)}>
          <Suspense fallback={<EuiLoadingSpinner size="m" />}>
            <workflowForm.Component
              value={notifications!.workflow}
              onChange={(next) =>
                setValue('notifications', { workflow: next }, { shouldDirty: true })
              }
              isInvalid={isWorkflowInvalid}
            />
          </Suspense>
        </div>
      ) : workflowForm.supported !== false ? (
        <EuiButton
          iconType="plusInCircle"
          onClick={handleCreate}
          size="s"
          color="text"
          data-test-subj="createSingleActionButton"
        >
          {createSingleActionLabel}
        </EuiButton>
      ) : null}
    </>
  );
};
