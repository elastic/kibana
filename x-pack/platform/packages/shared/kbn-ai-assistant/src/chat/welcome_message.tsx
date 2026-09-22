/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useState } from 'react';
import { css } from '@emotion/css';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useCurrentEuiBreakpoint } from '@elastic/eui';
import { AssistantBeacon } from '@kbn/ai-assistant-icon';

const InferenceFlyoutWrapper = lazy(() => import('@kbn/inference-endpoint-ui-common'));
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';
import { Disclaimer } from './disclaimer';
import { WelcomeMessageConnectors } from './welcome_message_connectors';
import { WelcomeMessageKnowledgeBase } from '../knowledge_base/welcome_message_knowledge_base';
import { StarterPrompts } from './starter_prompts';
import { useKibana } from '../hooks/use_kibana';
import { ElasticLlmConversationCallout } from './elastic_llm_conversation_callout';
import { KnowledgeBaseReindexingCallout } from '../knowledge_base/knowledge_base_reindexing_callout';
import { ElasticInferenceServiceCallout } from './elastic_inference_service_callout';

const fullHeightClassName = css`
  height: 100%;
`;

const centerMaxWidthClassName = css`
  max-width: 600px;
  text-align: center;
`;

export function WelcomeMessage({
  connectors,
  knowledgeBase,
  showElasticLlmCalloutInChat,
  showKnowledgeBaseReIndexingCallout,
  eisCalloutZIndex,
  onSelectPrompt,
}: {
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
  showElasticLlmCalloutInChat: boolean;
  showKnowledgeBaseReIndexingCallout: boolean;
  eisCalloutZIndex?: number;
  onSelectPrompt: (prompt: string) => void;
}) {
  const breakpoint = useCurrentEuiBreakpoint();

  const { http, notifications } = useKibana().services;

  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        direction="column"
        gutterSize="none"
        className={fullHeightClassName}
      >
        {showKnowledgeBaseReIndexingCallout ? (
          <EuiFlexItem grow={false}>
            <KnowledgeBaseReindexingCallout />
          </EuiFlexItem>
        ) : null}
        {showElasticLlmCalloutInChat ? (
          <EuiFlexItem grow={false}>
            <ElasticLlmConversationCallout />
          </EuiFlexItem>
        ) : null}
        {!connectors.loading && !connectors.connectors?.length ? (
          <>
            <EuiFlexItem grow={false} style={{ alignSelf: 'stretch' }}>
              <ElasticInferenceServiceCallout />
            </EuiFlexItem>
            <EuiSpacer size="l" />
          </>
        ) : null}
        <EuiFlexItem grow={false}>
          <AssistantBeacon backgroundColor="emptyShade" size="xl" />
        </EuiFlexItem>
        <EuiFlexItem grow className={centerMaxWidthClassName}>
          <EuiSpacer size={['xl', 'l'].includes(breakpoint!) ? 'm' : 's'} />
          <WelcomeMessageConnectors
            connectors={connectors}
            onSetupConnectorClick={() => setConnectorFlyoutOpen(true)}
          />
          {knowledgeBase.status.value?.enabled && connectors.connectors?.length ? (
            <WelcomeMessageKnowledgeBase
              knowledgeBase={knowledgeBase}
              eisCalloutZIndex={eisCalloutZIndex}
            />
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StarterPrompts onSelectPrompt={onSelectPrompt} />
          <EuiSpacer size="l" />
          <Disclaimer />
          <EuiSpacer size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>

      {connectorFlyoutOpen ? (
        <Suspense fallback={null}>
          <InferenceFlyoutWrapper
            http={http!}
            toasts={notifications!.toasts}
            onFlyoutClose={() => setConnectorFlyoutOpen(false)}
            onSubmitSuccess={() => connectors.reloadConnectors()}
          />
        </Suspense>
      ) : null}
    </>
  );
}
