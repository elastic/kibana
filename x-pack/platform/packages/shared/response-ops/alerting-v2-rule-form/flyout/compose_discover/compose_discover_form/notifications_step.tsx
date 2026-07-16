/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ActionForm, createInitialActionFormValue } from '../../../actions_form';
import type { FormValues } from '../../../form/types';
import { validateNotifications } from '../validation/notifications_validation';
import { useRuleNotificationDrafts } from './use_rule_notification_drafts';

interface NotificationsStepProps {
  http?: HttpStart;
  ruleId?: string;
}

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

export const NotificationsStep = ({ http, ruleId }: NotificationsStepProps) => {
  const { control, getValues, setValue } = useFormContext<FormValues>();

  // In edit mode, populate the form with the rule's existing simple actions.
  const { drafts: existingActions, isLoading } = useRuleNotificationDrafts({ http, ruleId });
  const hasExisting = useRef(false);
  useEffect(() => {
    if (hasExisting.current) return;
    if (existingActions.length === 0) return;
    if ((getValues('notifications')?.workflows?.length ?? 0) > 0) return;
    hasExisting.current = true;
    setValue(
      'notifications',
      { workflows: existingActions },
      {
        shouldDirty: false,
        shouldValidate: true,
      }
    );
  }, [existingActions, getValues, setValue]);

  const defaultWorkflows = useMemo(() => createInitialActionFormValue(), []);

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
      {/*
       * Controller stays mounted during loading so trigger(['notifications'])
       * cannot bypass validation while drafts are fetching.
       */}
      <Controller
        name="notifications"
        control={control}
        rules={{ validate: validateNotifications }}
        render={({ field, fieldState: { error } }) =>
          isLoading ? (
            <EuiFlexGroup justifyContent="center" data-test-subj="notificationsStepLoading">
              <EuiLoadingSpinner size="l" />
            </EuiFlexGroup>
          ) : (
            <div
              data-test-subj="composeDiscoverNotificationsField"
              onBlur={(e) => {
                // Form mode is `onBlur`; leaving the field runs rules.
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  field.onBlur();
                }
              }}
            >
              <EuiFormRow fullWidth isInvalid={!!error} error={error?.message}>
                <ActionForm
                  value={field.value?.workflows ?? defaultWorkflows}
                  onChange={(next) => field.onChange({ workflows: next })}
                  isInvalid={!!error}
                />
              </EuiFormRow>
            </div>
          )
        }
      />
    </>
  );
};
