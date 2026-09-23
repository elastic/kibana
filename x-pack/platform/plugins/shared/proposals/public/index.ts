/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { ProposalsPublicPlugin } from './plugin';

export function plugin(_initializerContext: PluginInitializerContext) {
  return new ProposalsPublicPlugin();
}

export type { ProposalsPublicPluginSetup, ProposalsPublicPluginStart } from './types';

export {
  useApproveProposal,
  useDismissProposal,
  usePendingProposals,
  useProposal,
} from './hooks/use_proposals_api';

export { queryKeys } from './query_keys';

export { DISMISS_REASON_LABELS, DISMISS_REASON_OPTIONS } from './dismiss_reason_i18n';
