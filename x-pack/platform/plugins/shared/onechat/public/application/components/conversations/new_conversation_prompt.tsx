/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
  EuiLink,
  EuiButton,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { ConversationContentWithMargins } from './conversation_grid';
import { ConversationInputForm } from './conversation_input/conversation_input_form';
import { useConversationGridCenterColumnWidth } from './conversation_grid.styles';

const fullHeightStyles = css`
  height: 100%;
`;

const WelcomeText: React.FC<{}> = () => {
  const { createOnechatUrl } = useNavigation();
  const labels = {
    container: i18n.translate('xpack.onechat.newConversationPrompt.container', {
      defaultMessage: 'New conversation welcome prompt',
    }),
    title: i18n.translate('xpack.onechat.newConversationPrompt.title', {
      defaultMessage: 'Welcome to Elastic Agent Builder',
    }),
    subtitle: (
      <FormattedMessage
        id="xpack.onechat.newConversationPrompt.subtitle"
        defaultMessage="Work interactively with your AI {agentsLink} using the chat interface. Your selected agent answers questions by searching your data with its assigned {toolsLink}."
        values={{
          agentsLink: (
            <EuiLink href={createOnechatUrl(appPaths.agents.list)}>
              {i18n.translate('xpack.onechat.newConversationPrompt.agentsLinkText', {
                defaultMessage: 'agents',
              })}
            </EuiLink>
          ),
          toolsLink: (
            <EuiLink href={createOnechatUrl(appPaths.tools.list)}>
              {i18n.translate('xpack.onechat.newConversationPrompt.toolsLinkText', {
                defaultMessage: 'tools',
              })}
            </EuiLink>
          ),
        }}
      />
    ),
  };
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      aria-label={labels.container}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon color="primary" size="xxl" type="logoElastic" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle>
          <h2>{labels.title}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText textAlign="center" color="subdued">
          <p>{labels.subtitle}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          href="#"
          target="_blank"
          size="m"
          aria-label={i18n.translate(
            'xpack.onechat.newConversationPrompt.agentBuilderDocsAriaLabel',
            {
              defaultMessage: 'Read Agent Builder documentation',
            }
          )}
        >
          {i18n.translate('xpack.onechat.newConversationPrompt.agentBuilderDocs', {
            defaultMessage: 'Read the docs',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const cards = [
  // Create agent
  {
    key: 'createAgent',
    title: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.agentCreation.title"
        defaultMessage="Create a new agent"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.agentCreation.description"
        defaultMessage="Start fresh with a custom agent tuned to your data and workflows."
      />
    ),
    iconType: 'plus',
    path: appPaths.agents.new,
  },
  // Manage agents
  {
    key: 'manageAgents',
    title: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.agentManagement.title"
        defaultMessage="Manage all agents"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.agentManagement.description"
        defaultMessage="View, edit, and organize the agents you've already built."
      />
    ),
    iconType: 'controls',
    path: appPaths.agents.list,
  },
  // Manage tools
  {
    key: 'manageTools',
    title: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.toolManagement.title"
        defaultMessage="Manage all tools"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.toolManagement.description"
        defaultMessage="Set up or adjust the tools your agents can use."
      />
    ),
    iconType: 'wrench',
    path: appPaths.tools.list,
  },
  // Documentation
  {
    key: 'documentation',
    title: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.documentation.title"
        defaultMessage="Read the docs"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.documentation.description"
        defaultMessage="Learn more about building agents and tools."
      />
    ),
    iconType: 'documentation',
    // TODO: Add documentation link
    path: '',
  },
];

const QuickNavigationCards: React.FC<{}> = () => {
  const { createOnechatUrl } = useNavigation();
  const { euiTheme } = useEuiTheme();
  const titleStyles = css`
    ${useEuiFontSize('s')}
    font-weight: ${euiTheme.font.weight.bold};
  `;
  const descriptionStyles = css`
    ${useEuiFontSize('xs')}
    color: ${euiTheme.colors.textSubdued};
  `;
  const iconBackgroundStyles = css`
    padding: ${euiTheme.size.s};
    background-color: ${euiTheme.colors.lightestShade};
    border-radius: ${euiTheme.border.radius.medium};
  `;
  return (
    <EuiFlexGroup gutterSize="s">
      {cards.map(({ key, title, description, iconType, path }) => {
        return (
          <EuiFlexItem key={key}>
            <EuiCard
              hasBorder
              textAlign="left"
              title={<span css={titleStyles}>{title}</span>}
              description={<span css={descriptionStyles}>{description}</span>}
              icon={
                <EuiFlexGroup justifyContent="flexStart">
                  <EuiFlexItem css={iconBackgroundStyles} component="span" grow={false}>
                    <EuiIcon type={iconType} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              href={createOnechatUrl(path)}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

const mainContainerStyles = css`
  grid-column: 2;
`;

const MainContainer: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div css={mainContainerStyles}>{children}</div>
);

const withMarginContainerStyles = css`
  grid-column: 1 / 4;
`;

const WithMarginsContainer: React.FC<{ children: ReactNode }> = ({ children }) => (
  <div css={withMarginContainerStyles}>{children}</div>
);

export const NewConversationPrompt: React.FC<{ onConversationStart: () => void }> = ({
  onConversationStart,
}) => {
  const { euiTheme } = useEuiTheme();
  const centerColumnWidth = useConversationGridCenterColumnWidth();
  const inputRowHeight = `calc(${euiTheme.size.l} * 7)`;
  const gridStyles = css`
    display: grid;
    grid-template-columns: 1fr ${centerColumnWidth} 1fr;
    grid-template-rows: auto ${inputRowHeight} auto;
    row-gap: ${euiTheme.size.l};
  `;
  return (
    <ConversationContentWithMargins css={fullHeightStyles}>
      <div css={gridStyles}>
        <MainContainer>
          <WelcomeText />
        </MainContainer>
        <WithMarginsContainer>
          <ConversationInputForm onSubmit={onConversationStart} />
        </WithMarginsContainer>
        <WithMarginsContainer>
          <QuickNavigationCards />
        </WithMarginsContainer>
      </div>
    </ConversationContentWithMargins>
  );
};
