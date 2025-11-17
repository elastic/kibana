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
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { ConversationContentWithMargins } from './conversation_grid';
import { ConversationInputForm } from './conversation_input/conversation_input_form';
import { useConversationGridCenterColumnWidth } from './conversation_grid.styles';
import { docLinks } from '../../../../common/doc_links';
import { WelcomeText } from '../common/welcome_text';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';

const fullHeightStyles = css`
  height: 100%;
`;

interface QuickNavigationCard {
  key: string;
  title: ReactNode;
  description: ReactNode;
  iconType: string;
  link: { path: string } | { url: string };
}

const createAgentCard: QuickNavigationCard = {
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
      defaultMessage="Build a custom agent tuned to your data and workflows."
    />
  ),
  iconType: 'plus',
  link: { path: appPaths.agents.new },
};

const cards: Array<QuickNavigationCard> = [
  // Manage agents
  {
    key: 'manageAgents',
    title: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.agentManagement.title"
        defaultMessage="Manage agents"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.agentManagement.description"
        defaultMessage="View, edit, and organize your existing agents."
      />
    ),
    iconType: 'controls',
    link: { path: appPaths.agents.list },
  },
  // Manage tools
  {
    key: 'manageTools',
    title: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.toolManagement.title"
        defaultMessage="Manage tools"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.toolManagement.description"
        defaultMessage="Add, remove, or edit the tools your agents can use."
      />
    ),
    iconType: 'wrench',
    link: { path: appPaths.tools.list },
  },
  // Documentation - Get Started
  {
    key: 'documentation',
    title: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.documentation.title"
        defaultMessage="Get started"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.onechat.welcome.quickNavigation.documentation.description"
        defaultMessage="Learn how to start building agents and tools."
      />
    ),
    iconType: 'documentation',
    link: { url: docLinks.getStarted },
  },
];

const QuickNavigationCards: React.FC<{}> = () => {
  const { createOnechatUrl } = useNavigation();
  const { manageAgents } = useUiPrivileges();
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

  const cardsToRender = useMemo(
    () => (manageAgents ? [createAgentCard, ...cards] : cards),
    [manageAgents]
  );
  return (
    <EuiFlexGroup
      data-test-subj="newConversationPromptLinks"
      gutterSize="s"
      component="ul"
      aria-label="Quick navigation links"
    >
      {cardsToRender.map(({ key, title, description, iconType, link }) => {
        return (
          <EuiFlexItem key={key} component="li">
            <EuiCard
              data-test-subj="newConversationPromptLinkItem"
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
              href={'url' in link ? link.url : createOnechatUrl(link.path)}
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

export const NewConversationPrompt: React.FC<{}> = () => {
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
      <div css={gridStyles} data-test-subj="agentBuilderWelcomePage">
        <MainContainer>
          <WelcomeText />
        </MainContainer>
        <WithMarginsContainer>
          <ConversationInputForm />
        </WithMarginsContainer>
        <WithMarginsContainer>
          <QuickNavigationCards />
        </WithMarginsContainer>
      </div>
    </ConversationContentWithMargins>
  );
};
