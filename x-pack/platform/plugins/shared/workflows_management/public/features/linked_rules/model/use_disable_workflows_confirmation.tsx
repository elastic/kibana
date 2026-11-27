/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import type { GetLinkedRulesResponse } from '@kbn/workflows-ui';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { linkedRulesQueryOptions } from './linked_rules_query_options';
import type { WorkflowRemovalImpactResponse } from '../../../../common/lib/workflow_dependents/api';
import { useKibana } from '../../../hooks/use_kibana';
import { removalImpactQueryOptions } from '../../workflow_dependents/model/removal_impact_query_options';
import {
  hasRemovalImpact,
  WorkflowCallersCallout,
} from '../../workflow_dependents/ui/workflow_callers_callout';
import { LinkedRulesCallout } from '../ui/linked_rules_callout';

export type ConfirmDisableWorkflows = (workflowIds: string[]) => Promise<boolean>;

interface PendingConfirmation {
  workflowCount: number;
  data?: GetLinkedRulesResponse;
  isError: boolean;
  callers?: WorkflowRemovalImpactResponse;
  isCallersError: boolean;
}

/** Asks the user to confirm before disabling workflows that alerting rules or other workflows run. */
export const useDisableWorkflowsConfirmation = (): {
  confirmDisable: ConfirmDisableWorkflows;
  confirmModal: JSX.Element | null;
} => {
  const api = useWorkflowsApi();
  const { http } = useKibana().services;
  const queryClient = useQueryClient();
  const modalTitleId = useGeneratedHtmlId();
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const resolveRef = useRef<(confirmed: boolean) => void>();
  const isMountedRef = useRef(false);
  // Unmounting cancels a disable that is being checked or waiting for confirmation.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      resolveRef.current?.(false);
      resolveRef.current = undefined;
    };
  }, []);

  const confirmDisable = useCallback<ConfirmDisableWorkflows>(
    async (workflowIds) => {
      const [result, callers] = await Promise.all([
        queryClient.fetchQuery(linkedRulesQueryOptions(api, workflowIds)).then(
          (data) => ({ data, isError: false }),
          () => ({ data: undefined, isError: true })
        ),
        queryClient.fetchQuery(removalImpactQueryOptions(http, workflowIds)).then(
          (data) => ({ callers: data, isCallersError: false }),
          () => ({ callers: undefined, isCallersError: true })
        ),
      ]);
      if (!isMountedRef.current) {
        return false;
      }
      const hasLinkedRules = !(result.data?.total === 0 && result.data.hiddenTotal === 0);
      if (!hasLinkedRules && !hasRemovalImpact(callers.callers) && !callers.isCallersError) {
        return true;
      }
      return new Promise((resolve) => {
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setPending({ ...result, ...callers, workflowCount: workflowIds.length });
      });
    },
    [api, http, queryClient]
  );

  const close = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = undefined;
    setPending(null);
  };

  const confirmModal = pending && (
    <EuiConfirmModal
      title={i18n.translate('workflows.linkedRules.disableModal.title', {
        defaultMessage: 'Disable {count, plural, one {workflow} other {# workflows}}?',
        values: { count: pending.workflowCount },
      })}
      titleProps={{ id: modalTitleId }}
      aria-labelledby={modalTitleId}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
      cancelButtonText={i18n.translate('workflows.linkedRules.disableModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('workflows.linkedRules.disableModal.confirm', {
        defaultMessage: 'Disable',
      })}
      buttonColor="warning"
      defaultFocusedButton="cancel"
      data-test-subj="workflowsDisableConfirmationModal"
    >
      <LinkedRulesCallout
        workflowCount={pending.workflowCount}
        data={pending.data}
        isError={pending.isError}
      />
      {(hasRemovalImpact(pending.callers) || pending.isCallersError) && (
        <>
          <EuiSpacer size="s" />
          <WorkflowCallersCallout
            workflowCount={pending.workflowCount}
            action="disable"
            data={pending.callers}
            isError={pending.isCallersError}
          />
        </>
      )}
    </EuiConfirmModal>
  );

  return { confirmDisable, confirmModal };
};
