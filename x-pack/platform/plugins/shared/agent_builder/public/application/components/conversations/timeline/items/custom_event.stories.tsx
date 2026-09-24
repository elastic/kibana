/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ConversationEventUIDefinition } from '@kbn/agent-builder-browser';
import { AgentBuilderStorybookProvider } from '../../../../__storybook__/agent_builder_storybook_provider';
import {
  STORY_CUSTOM_EVENT_TYPE,
  storyNoteEventDefinition,
} from '../../../../__storybook__/agent_builder_services';
import { CustomEvent } from './custom_event';
import { createCustomEvent } from './custom_event.factory';
import { createCustomEventItem } from './timeline_item.factory';

const event = createCustomEvent({ type: STORY_CUSTOM_EVENT_TYPE });

const throwingDefinition: ConversationEventUIDefinition = {
  type: STORY_CUSTOM_EVENT_TYPE,
  render: () => {
    throw new Error('Renderer failed');
  },
};

const meta: Meta<typeof CustomEvent> = {
  title: 'Conversations/Timeline/Custom Event',
  component: CustomEvent,
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider conversationId="story-conversation-1">
        <div style={{ maxWidth: 600, padding: 24 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CustomEvent>;

/** A custom event drawn by its registered renderer. */
export const Default: Story = {
  args: {
    item: createCustomEventItem({ event, definition: storyNoteEventDefinition }),
  },
};

/** A definition with `getHeader` gets the framework header: icon, actor, label and time. */
export const WithHeader: Story = {
  args: {
    item: createCustomEventItem({
      event,
      definition: {
        ...storyNoteEventDefinition,
        getHeader: () => ({ icon: 'document', iconTitle: 'Note', label: 'Note' }),
      },
    }),
  },
};

/** A renderer that throws is caught by the error boundary and replaced with a callout. */
export const RendererThrows: Story = {
  args: {
    item: createCustomEventItem({ event, definition: throwingDefinition }),
  },
};
