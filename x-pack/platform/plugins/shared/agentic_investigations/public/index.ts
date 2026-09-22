/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { AgenticInvestigationsPublicPlugin } from './plugin';

export function plugin(_initializerContext: PluginInitializerContext) {
  return new AgenticInvestigationsPublicPlugin();
}

export type {
  AgenticInvestigationsPublicPluginSetup,
  AgenticInvestigationsPublicPluginStart,
} from './types';

export {
  retryOnTransientError,
  useApproveProposal,
  useDismissProposal,
  usePendingProposals,
  useProposal,
} from './proposals/hooks/use_proposals_api';

export { queryKeys } from './proposals/query_keys';

export { DISMISS_REASON_LABELS, DISMISS_REASON_OPTIONS } from './proposals/dismiss_reason_i18n';

export {
  useListEscalations,
  useCreateEscalation,
  useAddToEscalation,
  useUpdateEscalation,
} from './escalations/hooks/use_escalations_api';

export {
  useEscalationUserProfiles,
  useSuggestEscalationAssignees,
} from './escalations/hooks/use_escalation_user_profiles';

export { escalationQueryKeys } from './escalations/query_keys';

export { useCurrentUserProfile } from './user_profiles/hooks/use_current_user_profile';
export { useSuggestUserProfiles } from './user_profiles/hooks/use_suggest_user_profiles';
