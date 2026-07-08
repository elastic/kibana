/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AttachmentLoadingSkeleton } from './attachment_loading_skeleton';

const meta: Meta<typeof AttachmentLoadingSkeleton> = {
  title: 'Agent Builder Attachment Cards/AttachmentLoadingSkeleton',
  component: AttachmentLoadingSkeleton,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 820 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AttachmentLoadingSkeleton>;

export const Default: Story = {};

export const CompactWidth: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
};
