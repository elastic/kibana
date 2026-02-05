/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PromptLayout, type PromptLayoutVariant } from './prompt_layout';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAssetBasePath } from '../../../hooks/use_asset_base_path';

export interface AddLlmConnectionPromptProps {
  variant?: PromptLayoutVariant;
}

export const AddLlmConnectionPrompt: React.FC<AddLlmConnectionPromptProps> = ({ variant }) => {
  const { navigationService, docLinksService } = useAgentBuilderServices();
  const { colorMode } = useEuiTheme();
  const assetBasePath = useAssetBasePath();
  const llmDocsHref = docLinksService.models;

  const primaryButton = (
    <EuiButton
      fill
      onClick={() => {
        navigationService.navigateToLlmConnectorsManagement();
      }}
    >
      <FormattedMessage
        id="xpack.agentBuilder.access.prompt.addLlm.actions.connectButton"
        defaultMessage="Connect LLM"
      />
    </EuiButton>
  );

  const secondaryButton = (
    <EuiButtonEmpty href={llmDocsHref} target="_blank" iconType="popout" iconSide="right">
      <FormattedMessage
        id="xpack.agentBuilder.access.prompt.addLlm.actions.docsLink"
        defaultMessage="Read the docs"
      />
    </EuiButtonEmpty>
  );

  return (
    <PromptLayout
      variant={variant}
      imageSrc={
        colorMode === 'LIGHT'
          ? `${assetBasePath}/brain_light.svg`
          : `${assetBasePath}/brain_dark.svg`
      }
      title={
        <FormattedMessage
          id="xpack.agentBuilder.access.prompt.addLlm.title"
          defaultMessage="No Large Language Model detected"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.agentBuilder.access.prompt.addLlm.description"
          defaultMessage="Select a model to integrate with your chat experience. You can also set up your connection."
        />
      }
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    />
  );
};
