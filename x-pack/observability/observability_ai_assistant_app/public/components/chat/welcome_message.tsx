/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/css';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiTitle,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { isSupportedConnectorType } from '@kbn/observability-ai-assistant-plugin/public';
import type { UseKnowledgeBaseResult } from '../../hooks/use_knowledge_base';
import type { UseGenAIConnectorsResult } from '../../hooks/use_genai_connectors';
import ctaImage from '../../assets/elastic_ai_assistant.png';
import { Disclaimer } from './disclaimer';
import { WelcomeMessageConnectors } from './welcome_message_connectors';
import { WelcomeMessageKnowledgeBase } from './welcome_message_knowledge_base';
import { useKibana } from '../../hooks/use_kibana';

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
}: {
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
}) {
  const breakpoint = useCurrentEuiBreakpoint();

  const {
    application: { navigateToApp, capabilities },
    plugins: {
      start: {
        triggersActionsUi: { getAddConnectorFlyout: ConnectorFlyout },
      },
    },
  } = useKibana().services;

  const [connectorFlyoutOpen, setConnectorFlyoutOpen] = useState(false);

  const handleConnectorClick = () => {
    if (capabilities.management?.insightsAndAlerting?.triggersActions) {
      setConnectorFlyoutOpen(true);
    } else {
      navigateToApp('management', {
        path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
      });
    }
  };

  const onConnectorCreated = (createdConnector: ActionConnector) => {
    setConnectorFlyoutOpen(false);

    if (isSupportedConnectorType(createdConnector.actionTypeId)) {
      connectors.reloadConnectors();
    }

    if (!knowledgeBase.status.value || knowledgeBase.status.value?.ready === false) {
      knowledgeBase.install();
    }
  };

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        direction="column"
        gutterSize="none"
        className={fullHeightClassName}
      >
        <EuiFlexItem grow className={centerMaxWidthClassName}>
          <EuiSpacer size={['xl', 'l'].includes(breakpoint!) ? 'l' : 's'} />

          <EuiImage
            src={ctaImage}
            alt="Elastic AI Assistant"
            size={breakpoint === 'xl' ? 300 : 'm'}
          />

          <EuiSpacer size="m" />

          <EuiTitle size={['xl', 'l'].includes(breakpoint!) ? 'm' : 's'}>
            <h2>
              {i18n.translate('xpack.observabilityAiAssistant.disclaimer.title', {
                defaultMessage: 'Welcome to the AI Assistant for Observability',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="m" />

          <WelcomeMessageConnectors
            connectors={connectors}
            onSetupConnectorClick={handleConnectorClick}
          />

          <WelcomeMessageKnowledgeBase connectors={connectors} knowledgeBase={knowledgeBase} />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiSpacer size="m" />
          <Disclaimer />
        </EuiFlexItem>
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
