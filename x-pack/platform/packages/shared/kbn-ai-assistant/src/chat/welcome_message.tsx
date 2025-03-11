/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useCurrentEuiBreakpoint } from '@elastic/eui';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { isSupportedConnectorType } from '@kbn/inference-common';
import { AssistantBeacon } from '@kbn/ai-assistant-icon';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';
import { Disclaimer } from './disclaimer';
import { WelcomeMessageConnectors } from './welcome_message_connectors';
import { WelcomeMessageKnowledgeBase } from './welcome_message_knowledge_base';
import { StarterPrompts } from './starter_prompts';
import { useKibana } from '../hooks/use_kibana';

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
  onSelectPrompt,
}: {
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
  onSelectPrompt: (prompt: string) => void;
}) {
  const breakpoint = useCurrentEuiBreakpoint();

  const { application, triggersActionsUi } = useKibana().services;

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

    if (!knowledgeBase.status.value || knowledgeBase.status.value?.ready === false) {
      knowledgeBase.install();
    }
  };

  const ConnectorFlyout = useMemo(
    () => triggersActionsUi.getAddConnectorFlyout,
    [triggersActionsUi]
  );

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        direction="column"
        gutterSize="none"
        className={fullHeightClassName}
      >
        <EuiFlexItem grow={false}>
          <AssistantBeacon backgroundColor="emptyShade" size="xl" />
        </EuiFlexItem>
        <EuiFlexItem grow className={centerMaxWidthClassName}>
          <EuiSpacer size={['xl', 'l'].includes(breakpoint!) ? 'l' : 's'} />
          <WelcomeMessageConnectors
            connectors={connectors}
            onSetupConnectorClick={handleConnectorClick}
          />
          {knowledgeBase.status.value?.enabled && connectors.connectors?.length ? (
            <WelcomeMessageKnowledgeBase knowledgeBase={knowledgeBase} />
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StarterPrompts onSelectPrompt={onSelectPrompt} />
          <EuiSpacer size="l" />
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
