/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { buildAgentInstructions } from '../../../common';

/** The URL people reach this Kibana at: the public one when set, else the page's own origin. */
export const getKibanaUrl = (http: CoreStart['http']): string =>
  http.basePath.publicBaseUrl ?? `${window.location.origin}${http.basePath.get()}`;

/**
 * Copies the instructions for reading one investigation with the Elastic CLI, and says so. Used by
 * the flyout's Actions menu; the Nightshift card menu does the same with its own toasts.
 */
export const copyAgentInstructions = (
  { http, notifications }: Pick<CoreStart, 'http' | 'notifications'>,
  investigationId: string
): boolean => {
  const copied = copyToClipboard(
    buildAgentInstructions({ investigationId, kibanaUrl: getKibanaUrl(http) })
  );
  if (copied) {
    notifications.toasts.addSuccess(
      i18n.translate('xpack.agenticInvestigations.conversationTemplate.agentInstructionsCopied', {
        defaultMessage: 'Copied agent instructions to clipboard',
      })
    );
  } else {
    notifications.toasts.addDanger(
      i18n.translate('xpack.agenticInvestigations.conversationTemplate.agentInstructionsFailed', {
        defaultMessage: 'Could not copy the agent instructions',
      })
    );
  }
  return copied;
};
