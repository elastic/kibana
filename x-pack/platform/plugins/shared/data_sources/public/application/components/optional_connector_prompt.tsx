/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StackConnectorConfig, ConnectorRole } from '@kbn/data-catalog-plugin';

export interface ConnectorPromptProps {
  connectorConfig: StackConnectorConfig;
  /** The effective role of this connector */
  role: ConnectorRole;
  onSetUp: () => void;
  onSkip: () => void;
}

/**
 * Prompt shown before configuring a connector.
 * - For 'optional' connectors: Shows description with Skip/Set up buttons
 * - For 'required' connectors: Shows description with Continue button (no skip)
 */
export const ConnectorPrompt: React.FC<ConnectorPromptProps> = ({
  connectorConfig,
  role,
  onSetUp,
  onSkip,
}) => {
  const connectorName = connectorConfig.name || connectorConfig.type;
  const isOptional = role === 'optional';
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={isOptional ? onSkip : onSetUp} maxWidth={500} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {isOptional
            ? i18n.translate('xpack.dataSources.connectorPrompt.optionalTitle', {
                defaultMessage: 'Set up {connectorName}?',
                values: { connectorName },
              })
            : i18n.translate('xpack.dataSources.connectorPrompt.requiredTitle', {
                defaultMessage: 'Configure {connectorName}',
                values: { connectorName },
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {connectorConfig.description && (
          <>
            <EuiText size="s">
              <p>{connectorConfig.description}</p>
            </EuiText>
            <EuiSpacer size="m" />
          </>
        )}

        {isOptional && connectorConfig.skipDescription && (
          <>
            <EuiCallOut
              announceOnMount={false}
              title={i18n.translate('xpack.dataSources.connectorPrompt.skipConsequenceTitle', {
                defaultMessage: 'If you skip this',
              })}
              color="warning"
              iconType="warning"
              size="s"
            >
              <p>{connectorConfig.skipDescription}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {isOptional && !connectorConfig.skipDescription && (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.dataSources.connectorPrompt.skipInfo', {
                defaultMessage: 'You can skip this for now and set it up later.',
              })}
            </p>
          </EuiText>
        )}

        {!isOptional && (
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.dataSources.connectorPrompt.requiredInfo', {
                defaultMessage: 'This connector is required for the data source to work properly.',
              })}
            </p>
          </EuiText>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        {isOptional && (
          <EuiButtonEmpty onClick={onSkip}>
            {i18n.translate('xpack.dataSources.connectorPrompt.skipButton', {
              defaultMessage: 'Skip',
            })}
          </EuiButtonEmpty>
        )}
        <EuiButton onClick={onSetUp} fill>
          {isOptional
            ? i18n.translate('xpack.dataSources.connectorPrompt.setUpButton', {
                defaultMessage: 'Set up {connectorName}',
                values: { connectorName },
              })
            : i18n.translate('xpack.dataSources.connectorPrompt.continueButton', {
                defaultMessage: 'Continue',
              })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

// Legacy export for backwards compatibility
export const OptionalConnectorPrompt = ConnectorPrompt;
