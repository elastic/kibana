/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configure } from '@storybook/test';
import type { Decorator } from '@storybook/react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { I18nProvider } from '@kbn/i18n-react';
import { conversationBackgroundStyles } from '../public/application/components/conversations/conversation.styles';

// Map data-test-subj to the testId attribute so play/findByTestId works
configure({ testIdAttribute: 'data-test-subj' });

const I18nDecorator: Decorator = (storyFn) => <I18nProvider>{storyFn()}</I18nProvider>;

const ConversationBackground: React.FC<{ fillViewport: boolean; children: React.ReactNode }> = ({
  fillViewport,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={[
        conversationBackgroundStyles(euiTheme),
        fillViewport &&
          css`
            min-height: 100vh;
          `,
      ]}
    >
      {children}
    </div>
  );
};

// Paints the gradient the conversation page has in Kibana, so stories look like the real app.
// Only the single-story view fills the viewport; the docs page stacks many stories.
const ConversationBackgroundDecorator: Decorator = (storyFn, { viewMode }) => (
  <ConversationBackground fillViewport={viewMode === 'story'}>{storyFn()}</ConversationBackground>
);

export const decorators = [I18nDecorator, ConversationBackgroundDecorator];

// Pin the Overview landing page to the top of the sidebar; everything else keeps its order.
export const parameters = {
  // No canvas padding, so the conversation background reaches the edges of the preview.
  layout: 'fullscreen',
  options: {
    storySort: {
      order: ['Overview'],
    },
  },
};
