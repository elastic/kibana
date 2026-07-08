/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiSplitPanel, EuiText } from '@elastic/eui';
import { AttachmentRenderErrorBoundary } from './attachment_render_error_boundary';

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiSplitPanel.Outer grow hasShadow={false} hasBorder={true} style={{ maxWidth: 820 }}>
    <EuiSplitPanel.Inner paddingSize="m">{children}</EuiSplitPanel.Inner>
  </EuiSplitPanel.Outer>
);

const ThrowingContent: React.FC = () => {
  throw new Error('Attachment renderer failed to render (storybook demo).');
};

const meta: Meta<typeof AttachmentRenderErrorBoundary> = {
  title: 'Agent Builder Attachment Cards/AttachmentRenderErrorBoundary',
  component: AttachmentRenderErrorBoundary,
  decorators: [(Story) => <Frame>{Story()}</Frame>],
};
export default meta;

type Story = StoryObj<typeof AttachmentRenderErrorBoundary>;

export const HappyPath: Story = {
  render: () => (
    <AttachmentRenderErrorBoundary>
      {() => <EuiText size="s">Attachment content rendered successfully.</EuiText>}
    </AttachmentRenderErrorBoundary>
  ),
};

export const RenderError: Story = {
  render: () => (
    <AttachmentRenderErrorBoundary>{() => <ThrowingContent />}</AttachmentRenderErrorBoundary>
  ),
};
