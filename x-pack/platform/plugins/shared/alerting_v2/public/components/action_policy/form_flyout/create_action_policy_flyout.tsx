/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { ActionPolicyFormFlyout } from './action_policy_form_flyout';
import type { ActionPolicyFormVariant } from '../form/action_policy_form';
import { toCreatePayload } from '../form/form_utils';
import type { ActionPolicyFormState } from '../form/types';
import { useCreateActionPolicy } from '../../../hooks/use_create_action_policy';
import { useCreateInlineWorkflows } from '../../../hooks/use_create_inline_workflows';

export interface CreateActionPolicyFlyoutProps {
  onClose: () => void;
  onCreated: (policy: { id: string; name: string; tags: string[] }) => void;
  /** Compact create-from-rule layout. Defaults to `essential` for Compose Discover. */
  variant?: ActionPolicyFormVariant;
  /** Prefills `matcher.tags` (and a suggested name) when opening from a rule. */
  ruleTags?: string[];
}

/**
 * Host wrapper that mounts the action-policy form flyout for create,
 * including inline workflow creation. Intended for nesting under Compose Discover.
 */
export const CreateActionPolicyFlyout = ({
  onClose,
  onCreated,
  variant = 'essential',
  ruleTags = [],
}: CreateActionPolicyFlyoutProps) => {
  const { toasts } = useService(CoreStart('notifications'));
  const { mutateAsync: createPolicy, isLoading: isCreating } = useCreateActionPolicy();
  const { createInlineWorkflows, rollbackWorkflows } = useCreateInlineWorkflows();
  const [isCreatingWorkflows, setIsCreatingWorkflows] = useState(false);

  const defaultValues = useMemo((): Partial<ActionPolicyFormState> => {
    const tags = ruleTags.filter(Boolean);
    return {
      name: tags.length > 0 ? `${tags.join(' · ')} — SRE on-call` : '',
      matcher: tags.length > 0 ? { tags } : null,
    };
  }, [ruleTags]);

  const onSave = useCallback(
    async (values: ActionPolicyFormState) => {
      let createdIds: string[] = [];
      setIsCreatingWorkflows(true);
      try {
        createdIds = await createInlineWorkflows(values.inlineActions);
      } catch (err) {
        toasts.addError(err instanceof Error ? err : new Error(String(err)), {
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
        ...createdIds.map((id) => ({ type: 'workflow' as const, id })),
      ];

      try {
        const created = await createPolicy(toCreatePayload({ ...values, destinations }));
        const linkTags = values.matcher?.tags ?? [];
        onCreated({
          id: created.id,
          name: created.name,
          tags: linkTags.length > 0 ? linkTags : created.tags ?? [],
        });
        onClose();
      } catch {
        await rollbackWorkflows(createdIds);
      }
    },
    [createInlineWorkflows, createPolicy, onClose, onCreated, rollbackWorkflows, toasts]
  );

  return (
    <ActionPolicyFormFlyout
      onClose={onClose}
      onSave={onSave}
      isLoading={isCreating || isCreatingWorkflows}
      asSecondaryFlyout
      variant={variant}
      defaultValues={defaultValues}
    />
  );
};
