/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AgentBuilderStorybookProvider } from '../../../../__storybook__/agent_builder_storybook_provider';
import { UserMessage } from './user_message';

const meta: Meta<typeof UserMessage> = {
  title: 'Conversations/Timeline/Markdown',
  component: UserMessage,
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider conversationId="story-conversation-1">
        <div style={{ maxWidth: 600, padding: 24 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ],
  args: {
    isPendingCurrentRound: false,
    startedAt: '2026-01-01T10:00:00.000Z',
  },
};
export default meta;

type Story = StoryObj<typeof UserMessage>;

export const PlainText: Story = {
  args: {
    input: 'Just a plain message with no markdown at all.',
  },
};

export const LineBreaks: Story = {
  args: {
    input: 'First line (Shift+Enter)\nSecond line (2x Shift+Enter)\n\nThird line',
  },
};

export const BoldItalicStrikethrough: Story = {
  args: {
    input: 'This is **bold**, this is _italic_, and this is ~~strikethrough~~.',
  },
};

export const Headings: Story = {
  args: {
    input:
      '# Heading 1\n\n## Heading 2\n\n### Heading 3\n\n#### Heading 4\n\n##### Heading 5\n\n###### Heading 6',
  },
};

export const Lists: Story = {
  args: {
    input:
      '- item one\n- item two\n  - nested item\n\n' +
      '1. first\n2. second\n3. third\n\n' +
      '- [ ] todo item\n- [x] done item',
  },
};

export const InlineAndBlockCode: Story = {
  args: {
    input:
      'Use `EuiMarkdownFormat` for this.\n\n' +
      '```js\nconst x = 1;\nconsole.log(x);\n```\n\n' +
      '```bash\nnpm install @elastic/eui\n```',
  },
};

export const Table: Story = {
  args: {
    input: '| Column A | Column B |\n| --- | --- |\n| foo | bar |\n| baz | qux |',
  },
};

export const Blockquote: Story = {
  args: {
    input: '> This is a quoted line\n> spanning two lines.',
  },
};

export const PlainLink: Story = {
  args: {
    input:
      'Check out [Elastic](https://www.elastic.co) for more. External links ask for confirmation before opening in a new tab.',
  },
};

export const MarkdownImage: Story = {
  args: {
    input:
      '![Dummy image](https://dummyimage.com/300x200/3b3b3b/ffffff&text=Dummy+image)\n\n' +
      'Markdown Image',
  },
};

export const SkillBadge: Story = {
  args: {
    input: 'Please [/Summarize](skill://skill-1) this conversation.',
  },
};

export const SmlBadge: Story = {
  args: {
    input: 'Compare this to [@dashboard/Sales Overview](sml://entry-1).',
  },
};

export const ImageBadge: Story = {
  args: {
    input: 'See [screenshot.png](image://screenshot.png) for the error.',
  },
};

export const BadgesInsideMarkdown: Story = {
  args: {
    input:
      '- Use [/Summarize](skill://skill-1) first\n' +
      '- Then use [@dashboard/Sales Overview](sml://entry-1)\n\n' +
      'Also **bold with [/Summarize](skill://skill-1) inside**.',
  },
};

export const AccidentalMarkdown: Story = {
  args: {
    input:
      'FROM logs-* | WHERE host_name == "server_1" AND bytes > 1000\n\n' +
      '{"key": "value", "nested_field": 42}',
  },
};

export const UnknownSchemeFallsBackToText: Story = {
  args: {
    input: 'This should stay literal, not become a link: [/Unknown](unknown://id-1)',
  },
};
