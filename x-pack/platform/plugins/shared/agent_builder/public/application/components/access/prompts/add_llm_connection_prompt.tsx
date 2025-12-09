/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { docLinks } from '../../../../../common/doc_links';
import { PromptLayout } from './prompt_layout';
import { useOnechatServices } from '../../../hooks/use_onechat_service';
import { useAssetBasePath } from '../../../hooks/use_asset_base_path';

export const AddLlmConnectionPrompt: React.FC<{}> = () => {
  const { navigationService } = useOnechatServices();
  const { colorMode } = useEuiTheme();
  const assetBasePath = useAssetBasePath();
  const llmDocsHref = docLinks.models;

  const primaryButton = (
    <EuiButton
      fill
      onClick={() => {
        navigationService.navigateToLlmConnectorsManagement();
      }}
    >
      <FormattedMessage
        id="xpack.onechat.access.prompt.addLlm.actions.connectButton"
        defaultMessage="Connect LLM"
      />
    </EuiButton>
  );

  const secondaryButton = (
    <EuiButtonEmpty href={llmDocsHref} target="_blank" iconType="popout" iconSide="right">
      <FormattedMessage
        id="xpack.onechat.access.prompt.addLlm.actions.docsLink"
        defaultMessage="Read the docs"
      />
    </EuiButtonEmpty>
  );

  return (
    <PromptLayout
      imageSrc={
        colorMode === 'LIGHT'
          ? `${assetBasePath}/brain_light.svg`
          : `${assetBasePath}/brain_dark.svg`
      }
      title={
        <FormattedMessage
          id="xpack.onechat.access.prompt.addLlm.title"
          defaultMessage="No Large Language Model detected"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.onechat.access.prompt.addLlm.description"
          defaultMessage="Select a model to integrate with your chat experience. You can also set up your connection."
        />
      }
      primaryButton={primaryButton}
      secondaryButton={secondaryButton}
    />
  );
};
