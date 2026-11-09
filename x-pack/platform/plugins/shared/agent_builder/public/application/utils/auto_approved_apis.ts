/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId, type ApiTarget } from '@kbn/agent-builder-common';
import { labels } from './i18n';

/** Auto-approved selectors, keyed by API target. */
export type AutoApprovedApisValue = Partial<Record<ApiTarget, string[]>>;

/**
 * Returns the explanation shown when the current user cannot change an agent's auto-approved APIs.
 *
 * @param agentId - The edited agent, or `undefined` on the create form.
 */
export const getAutoApprovedApisDisabledReason = (agentId: string | undefined): string =>
  agentId === agentBuilderDefaultAgentId
    ? labels.autoApprovedApis.defaultAgentRestrictedHelpText
    : labels.autoApprovedApis.restrictedHelpText;
