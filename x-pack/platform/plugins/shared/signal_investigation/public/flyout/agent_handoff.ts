/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID } from '../../common/findings_attachment';

export { AI_CHAT_EXPERIENCE_TYPE, AIChatExperience };

const CONNECTORS_INTERNAL_API_PATH = '/internal/search_inference_endpoints/connectors';
const OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID = 'observability_ai_insights';

const registeredAttachmentsServices = new WeakSet<object>();

/**
 * Evaluates the four gates required to display Continue with AI agent:
 * Enterprise license, `capabilities.agentBuilder.show`, Agent chat experience, and a connector.
 */
export const canShowContinueWithAgent = ({
  hasEnterpriseLicense,
  hasAgentBuilderCapability,
  chatExperience,
  hasConnector,
  hasOpenChat,
}: {
  hasEnterpriseLicense: boolean;
  hasAgentBuilderCapability: boolean;
  chatExperience: string | undefined;
  hasConnector: boolean;
  hasOpenChat: boolean;
}): boolean =>
  hasEnterpriseLicense &&
  hasAgentBuilderCapability &&
  chatExperience === AIChatExperience.Agent &&
  hasConnector &&
  hasOpenChat;

/** Checks whether at least one LLM connector exists for Agent Builder handoff. */
export const checkAgentBuilderConnectorAvailable = async ({
  core,
  agentBuilder,
}: {
  core: CoreStart;
  agentBuilder?: AgentBuilderPluginStart;
}): Promise<boolean> => {
  if (typeof agentBuilder?.getAgentBuilderAccess === 'function') {
    try {
      const access = await agentBuilder.getAgentBuilderAccess();
      return Boolean(access?.hasLlmConnector);
    } catch {
      return false;
    }
  }

  try {
    const response = await core.http.get<{ connectors?: unknown[] }>(CONNECTORS_INTERNAL_API_PATH, {
      query: { featureId: OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID },
      version: '1',
    });
    return Array.isArray(response?.connectors) && response.connectors.length > 0;
  } catch {
    return false;
  }
};

/** Registers the UI pill definition for `platform.signal_investigation.findings` once per session. */
export const registerFindingsAttachmentUiDefinition = (
  agentBuilder: AgentBuilderPluginStart | undefined
): void => {
  const attachments = agentBuilder?.attachments;
  if (!attachments || typeof attachments.addAttachmentType !== 'function') {
    return;
  }
  if (registeredAttachmentsServices.has(attachments)) {
    return;
  }
  registeredAttachmentsServices.add(attachments);

  attachments.addAttachmentType(SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID, {
    getLabel: () =>
      i18n.translate('xpack.signalInvestigation.attachments.findings.label', {
        defaultMessage: 'Related changes findings',
      }),
    getIcon: () => 'magnify',
  });
};
