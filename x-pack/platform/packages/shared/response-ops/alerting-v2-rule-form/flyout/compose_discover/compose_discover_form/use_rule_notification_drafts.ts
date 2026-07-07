/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import {
  mapWorkflowToActionDraft,
  selectRuleSimpleActionPolicies,
  type ActionDraft,
  type RuleScopedSimpleActionPolicy,
  type WorkflowForActionDraft,
} from '../../../actions_form';
import { useMatchedActionPolicies } from './use_matched_action_policies';

const WORKFLOWS_API_VERSION = '2023-10-31';

interface UseRuleNotificationDraftsParams {
  http?: HttpStart;
  ruleId?: string;
}

/**
 * Query key for the rule's existing simple-action drafts. Exported so the save
 * flow can drop the cache after mutating, forcing the edit flyout to re-populate
 * from the latest workflows instead of a stale snapshot.
 */
export const getRuleNotificationDraftsQueryKey = (ruleId?: string) =>
  ['ruleNotificationDrafts', ruleId] as const;

export interface UseRuleNotificationDraftsResult {
  isLoading: boolean;
  drafts: ActionDraft[];
}

const scopedPoliciesSignature = (policies: RuleScopedSimpleActionPolicy[]): string =>
  policies.map((p) => `${p.policyId}:${p.policyVersion ?? ''}:${p.workflowId}`).join('|');

/**
 * Loads the rule's existing simple-action policies (and their workflows) and
 * reverse-maps them into {@link ActionDraft}s used to populate the form with the
 * rule's already-configured simple actions when editing. Each draft carries its
 * `origin` (policy + workflow ids) so saving can update/delete the source
 * instead of creating a duplicate. Returns an empty list in create mode (no
 * `ruleId`).
 */
export const useRuleNotificationDrafts = ({
  http,
  ruleId,
}: UseRuleNotificationDraftsParams): UseRuleNotificationDraftsResult => {
  const enabled = Boolean(ruleId) && Boolean(http);

  const { isLoading: isMatchLoading, items } = useMatchedActionPolicies({ http, ruleId });
  const scopedPolicies = useMemo(
    () =>
      ruleId
        ? selectRuleSimpleActionPolicies(
            items.map((item) => item.actionPolicy),
            ruleId
          )
        : [],
    [items, ruleId]
  );

  const draftsEnabled = Boolean(http) && scopedPolicies.length > 0;
  const draftsQueryKey = [
    ...getRuleNotificationDraftsQueryKey(ruleId),
    scopedPoliciesSignature(scopedPolicies),
  ];
  const { isLoading: isDraftsLoading, data } = useQuery({
    queryKey: draftsQueryKey,
    enabled: draftsEnabled,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ActionDraft[]> => {
      if (!http) return [];
      return Promise.all(
        scopedPolicies.map(async ({ policyId, policyVersion, workflowId }) => {
          const workflow = await http.get<WorkflowForActionDraft>(
            `/api/workflows/workflow/${encodeURIComponent(workflowId)}`,
            { version: WORKFLOWS_API_VERSION }
          );
          return mapWorkflowToActionDraft(workflow, { policyId, policyVersion, workflowId });
        })
      );
    },
  });

  return {
    isLoading: (enabled && isMatchLoading) || (draftsEnabled && isDraftsLoading),
    drafts: data ?? [],
  };
};
