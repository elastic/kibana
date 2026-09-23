/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { useCreateActionPolicy } from '../../../hooks/use_create_action_policy';
import { useCreateInlineWorkflows } from '../../../hooks/use_create_inline_workflows';
import { toCreatePayload } from '../form/form_utils';
import type { ActionPolicyFormState } from '../form/types';
import { ActionPolicyFormFlyout } from './action_policy_form_flyout';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateActionPolicyFormFlyout = ({ onClose, onSuccess }: Props) => {
  const { toasts } = useService(CoreStart('notifications'));
  const { mutateAsync: createPolicy, isLoading: isCreatingPolicy } = useCreateActionPolicy();
  const { createInlineWorkflows, rollbackWorkflows } = useCreateInlineWorkflows();
  const [isCreatingWorkflows, setIsCreatingWorkflows] = useState(false);

  const createActionPolicy = useCallback(
    async (values: ActionPolicyFormState) => {
      let createdWorkflowIds: string[] = [];
      setIsCreatingWorkflows(true);

      try {
        createdWorkflowIds = await createInlineWorkflows(values.inlineActions);
      } catch (error) {
        toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: i18n.translate('xpack.alertingV2.actionPolicy.inlineWorkflowsError', {
            defaultMessage: 'Failed to create simple workflows',
          }),
        });
        return;
      } finally {
        setIsCreatingWorkflows(false);
      }

      const destinations: ActionPolicyDestination[] = [
        ...values.destinations,
        ...createdWorkflowIds.map((id) => ({ type: 'workflow' as const, id })),
      ];

      try {
        await createPolicy(toCreatePayload({ ...values, destinations }));
      } catch {
        await rollbackWorkflows(createdWorkflowIds);
        return;
      }

      onSuccess();
    },
    [createInlineWorkflows, createPolicy, onSuccess, rollbackWorkflows, toasts]
  );

  return (
    <ActionPolicyFormFlyout
      onClose={onClose}
      onSave={createActionPolicy}
      isLoading={isCreatingPolicy || isCreatingWorkflows}
    />
  );
};
