/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiCallOut, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { MANAGEMENT_APP_ID } from '../../../hooks/use_navigation';
import { ErrorPrompt } from '../../common/prompt/error_prompt';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAssetBasePath } from '../../../hooks/use_asset_base_path';
import { useKibana } from '../../../hooks/use_kibana';
import type { PromptLayoutVariant } from '../../common/prompt/layout';

export interface AddLlmConnectionPromptProps {
  variant?: PromptLayoutVariant;
}

export const AddLlmConnectionPrompt: React.FC<AddLlmConnectionPromptProps> = ({ variant }) => {
  const { navigationService, docLinksService } = useAgentBuilderServices();
  const { colorMode } = useEuiTheme();
  const assetBasePath = useAssetBasePath();
  const llmDocsHref = docLinksService.models;
  const {
    services: { application },
  } = useKibana();
  const currentAppId = useObservable(application.currentAppId$, undefined);
  const isInManagementApp = currentAppId === MANAGEMENT_APP_ID;

  const primaryAction = isInManagementApp ? (
    <EuiCallOut
      announceOnMount
      size="s"
      iconType="info"
      title={
        <FormattedMessage
          id="xpack.agentBuilder.access.prompt.addLlm.onConnectorsPageCalloutTitle"
          defaultMessage="Configure your LLM connection on this page"
        />
      }
      data-test-subj="connectLLMOnConnectorsPageCallout"
    />
  ) : (
    <EuiButton
      fill
      onClick={() => {
        navigationService.navigateToLlmConnectorsManagement();
      }}
      data-test-subj="connectLLMButton"
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

  const brainImage =
    colorMode === 'LIGHT' ? `${assetBasePath}/brain_light.svg` : `${assetBasePath}/brain_dark.svg`;

  return (
    <ErrorPrompt
      variant={variant}
      errorType="ADD_LLM_CONNECTION"
      imageSrc={brainImage}
      primaryButton={primaryAction}
      secondaryButton={secondaryButton}
    />
  );
};
