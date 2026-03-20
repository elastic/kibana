/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
import { ConnectorListButtonBase } from '../../../connector_list_button/connector_list_button';

export interface GenerateSuggestionButtonProps extends EuiButtonProps {
  onClick(connectorId: string): void;
  aiFeatures: AIFeatures;
}

export const GenerateSuggestionButton = ({
  aiFeatures,
  onClick,
  ...rest
}: GenerateSuggestionButtonProps) => {
  const handleClick = () => {
    if (aiFeatures.genAiConnectors.selectedConnector) {
      onClick(aiFeatures.genAiConnectors.selectedConnector);
    }
  };

  return (
    <ConnectorListButtonBase
      aiFeatures={aiFeatures}
      buttonProps={{
        size: 's',
        iconType: 'sparkles',
        'data-test-subj': 'streamsAppGenerateSuggestionButton',
        onClick: handleClick,
        isDisabled: !aiFeatures.genAiConnectors.selectedConnector || rest.isDisabled,
        ...rest,
      }}
    />
  );
};
