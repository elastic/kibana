/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { docLinks } from '../../../../../common/doc_links';
import { WelcomeText } from '../../common/welcome_text';
import { PromptLayout } from './prompt_layout';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

const AddLlmConnectionActions: React.FC<{}> = () => {
  const { navigationService } = useOnechatServices();
  const llmDocsHref = docLinks.models;
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="sparkles"
          color="warning"
          onClick={() => {
            navigationService.navigateToLlmConnectorsManagement();
          }}
        >
          <FormattedMessage
            id="xpack.onechat.access.prompt.addLlm.actions.connectButton"
            defaultMessage="Connect to an LLM"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink href={llmDocsHref} target="_blank">
          <FormattedMessage
            id="xpack.onechat.access.prompt.addLlm.actions.docsLink"
            defaultMessage="Read the docs"
          />
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const AddLlmConnectionPanel: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const panelStyles = css`
    max-inline-size: calc(${euiTheme.size.xxl} * 13);
  `;
  return (
    <EuiPanel css={panelStyles} color="warning">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.onechat.access.prompt.addLlm.title"
                defaultMessage="No Large Language Model (LLM) detected"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.onechat.access.prompt.addLlm.description"
                defaultMessage="Select a model to integrate with your chat experience. You can also set up your connection."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <AddLlmConnectionActions />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const AddLlmConnectionPrompt: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const promptContainerStyles = css`
    max-inline-size: calc(${euiTheme.size.xxl} * 20);
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;
  return (
    <PromptLayout>
      <EuiFlexGroup
        css={promptContainerStyles}
        direction="column"
        gutterSize="xl"
        justifyContent="center"
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          <WelcomeText />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddLlmConnectionPanel />
        </EuiFlexItem>
      </EuiFlexGroup>
    </PromptLayout>
  );
};
