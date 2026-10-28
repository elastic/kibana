/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { FeedbackModal } from './feedback_modal';

const meta: Meta<typeof FeedbackModal> = {
  title: 'Conversations/Feedback/FeedbackModal',
  component: FeedbackModal,
  args: {
    chips: [],
    comment: '',
    isSubmitting: false,
    onToggleChip: () => {},
    onCommentChange: () => {},
    onSubmit: () => {},
    onClose: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof FeedbackModal>;

export const DownEmpty: Story = {
  args: { vote: 'down' },
};

export const UpEmpty: Story = {
  args: { vote: 'up' },
};

export const DownWithChips: Story = {
  args: { vote: 'down', chips: ['inaccurate', 'incomplete'] },
};

export const DownWithComment: Story = {
  args: { vote: 'down', chips: ['inaccurate'], comment: 'The facts were wrong.' },
};

export const Submitting: Story = {
  args: {
    vote: 'down',
    chips: ['inaccurate'],
    comment: 'The facts were wrong.',
    isSubmitting: true,
  },
};
