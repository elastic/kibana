/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { isSupportedConnectorType } from '@kbn/inference-common';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/public';

import {
  AddConnector,
  ReadyToHelp,
  ReadyToHelpProps,
  NoConnectorAccess,
} from '@kbn/ai-assistant-cta';

import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';
import { Disclaimer } from './disclaimer';
import { StarterPrompts } from './starter_prompts';
import { useKibana } from '../hooks/use_kibana';
import { WelcomeMessageKnowledgeBase } from './welcome_message_knowledge_base';

const fullHeightClassName = css`
  height: 100%;
`;

export function WelcomeMessage({
  connectors,
  knowledgeBase,
  onSelectPrompt,
}: {
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
  onSelectPrompt: (prompt: string) => void;
}) {
  const { application, triggersActionsUi, observabilityAIAssistant } = useKibana().services;
  const {
    service: { getScopes },
  } = observabilityAIAssistant;

  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);

  const handleConnectorClick = () => {
    if (application?.capabilities.management?.insightsAndAlerting?.triggersActions) {
      setConnectorFlyoutOpen(true);
    } else {
      application?.navigateToApp('management', {
        path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
      });
    }
  };

  const onConnectorCreated = (createdConnector: ActionConnector) => {
    setConnectorFlyoutOpen(false);

    if (isSupportedConnectorType(createdConnector.actionTypeId)) {
      connectors.reloadConnectors();
    }
  };

  const ConnectorFlyout = useMemo(
    () => triggersActionsUi.getAddConnectorFlyout,
    [triggersActionsUi]
  );

  const isKnowledgeBaseReady = useMemo(
    () =>
      knowledgeBase.status.value?.kbState === KnowledgeBaseState.READY &&
      !knowledgeBase.isInstalling &&
      !knowledgeBase.status.value?.errorMessage,
    [knowledgeBase]
  );

  const isConnectorReady = useMemo(
    () => !connectors.error && connectors.connectors?.length && connectors.connectors.length > 0,
    [connectors]
  );

  const CallToAction = () => {
    if (!isConnectorReady) {
      if (connectors.error) {
        return <NoConnectorAccess data-test-subj="no-connector-access-cta" />;
      }
      return <AddConnector onAddConnector={handleConnectorClick} />;
    }

    if (knowledgeBase.isInstalling || !isKnowledgeBaseReady || knowledgeBase.isPolling) {
      return <WelcomeMessageKnowledgeBase knowledgeBase={knowledgeBase} />;
    }

    const scopes = getScopes();

    let type: ReadyToHelpProps['type'] = 'stack';

    if (scopes.length === 1) {
      if (scopes[0] === 'observability') {
        type = 'oblt';
      }
      if (scopes[0] === 'search') {
        type = 'search';
      }
    }
    return <ReadyToHelp type={type} />;
  };

  const Footer = () => {
    if (!isConnectorReady || !isKnowledgeBaseReady) {
      return null;
    }

    return (
      <EuiFlexItem grow={false}>
        <StarterPrompts onSelectPrompt={onSelectPrompt} />
        <EuiSpacer size="l" />
        <Disclaimer />
      </EuiFlexItem>
    );
  };

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        direction="column"
        gutterSize="none"
        justifyContent="center"
        className={fullHeightClassName}
      >
        <EuiFlexItem
          grow={true}
          className={css`
            justify-content: center;
          `}
        >
          <CallToAction />
        </EuiFlexItem>
        <Footer />
      </EuiFlexGroup>

      {connectorFlyoutOpen ? (
        <ConnectorFlyout
          featureId={GenerativeAIForObservabilityConnectorFeatureId}
          onConnectorCreated={onConnectorCreated}
          onClose={() => setConnectorFlyoutOpen(false)}
        />
      ) : null}
    </>
  );
}
