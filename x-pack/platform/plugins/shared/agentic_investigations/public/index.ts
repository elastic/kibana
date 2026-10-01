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
  useAssignEscalation,
  useLinkedInvestigations,
  useListEscalations,
  useCreateEscalation,
  useAttachToEscalation,
  useSetEscalationStatus,
  useEscalationClosePreview,
  useEscalationsForInvestigation,
} from './escalations/hooks/use_escalations_api';

export {
  useAssignInvestigation,
  useSetInvestigationStatus,
  useInvestigationClosePreview,
} from './investigations/hooks/use_investigations_api';

export { escalationQueryKeys } from './escalations/query_keys';

export {
  useCurrentUserProfile,
  useSuggestUserProfiles,
  useUserProfiles,
  userProfileQueryKeys,
} from './user_profiles';

export {
  getAgenticInvestigationsCapabilities,
  useAgenticInvestigationsCapabilities,
  type AgenticInvestigationsCapabilities,
} from './hooks/use_agentic_investigations_capabilities';
export { useOpenInChat, type OpenInChat } from './hooks/use_open_in_chat';
export { getSharedInvestigationsQueryClient } from './shared_query_client';
export {
  useAssigneePickers,
  type AssigneePickerProps,
  type UseAssigneePickersOptions,
} from './components/connected_assignees/use_assignee_pickers';
export { useStatusSignal } from './components/connected_status/use_status_signal';
export { decisionErrorMessage } from './components/proposed_actions/decision_errors';
export { EscalationModalBoundary } from './components/escalation_modal/escalation_modal_boundary';
export {
  LazyConnectedCloseInvestigationModal,
  LazyConnectedEscalationModal,
} from './components/lazy_connected_components';
