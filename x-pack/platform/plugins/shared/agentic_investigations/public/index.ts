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
  useListEscalations,
  useCreateEscalation,
  useAddToEscalation,
  useUpdateEscalation,
} from './escalations/hooks/use_escalations_api';

export { useAssignInvestigation } from './investigations/hooks/use_investigations_api';

export { escalationQueryKeys } from './escalations/query_keys';

export {
  useCurrentUserProfile,
  useSuggestUserProfiles,
  useUserProfiles,
  userProfileQueryKeys,
} from './user_profiles';
