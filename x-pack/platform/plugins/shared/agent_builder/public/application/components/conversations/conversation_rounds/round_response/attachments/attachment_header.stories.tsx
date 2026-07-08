/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiSplitPanel } from '@elastic/eui';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { AttachmentHeader } from './attachment_header';

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiSplitPanel.Outer grow hasShadow={false} hasBorder={true} style={{ maxWidth: 820 }}>
    {children}
  </EuiSplitPanel.Outer>
);

const secondaryAction = {
  label: 'Copy',
  icon: 'copy',
  type: ActionButtonType.SECONDARY,
  handler: action('copy clicked'),
};

const primaryAction = {
  label: 'Open',
  icon: 'expand',
  type: ActionButtonType.PRIMARY,
  handler: action('open clicked'),
};

const overflowAction = {
  label: 'Save to library',
  icon: 'save',
  type: ActionButtonType.OVERFLOW,
  handler: action('save clicked'),
};

const meta: Meta<typeof AttachmentHeader> = {
  title: 'Agent Builder Attachment Cards/AttachmentHeader',
  component: AttachmentHeader,
  decorators: [(Story) => <Frame>{Story()}</Frame>],
};
export default meta;

type Story = StoryObj<typeof AttachmentHeader>;

export const Default: Story = {
  args: {
    icon: 'document',
    title: 'workflow.yaml',
    actionButtons: [secondaryAction, primaryAction],
    onClose: action('close'),
  },
};

export const WithSubtitle: Story = {
  args: {
    icon: 'document',
    title: 'workflow.yaml',
    subtitle: 'Managed workflow • updated 2 minutes ago',
    actionButtons: [secondaryAction, primaryAction],
    onClose: action('close'),
  },
};

export const WithBadges: Story = {
  args: {
    icon: 'visualizeApp',
    title: 'Alerts by severity',
    badges: [
      { label: 'ES|QL', color: 'hollow' },
      { label: 'experimental', color: 'accent' },
    ],
    actionButtons: [secondaryAction, primaryAction],
    onClose: action('close'),
  },
};

export const WithOverflowActions: Story = {
  args: {
    icon: 'document',
    title: 'workflow.yaml.diff',
    subtitle: '+42 −17 lines',
    actionButtons: [
      secondaryAction,
      primaryAction,
      overflowAction,
      {
        label: 'Delete',
        icon: 'trash',
        type: ActionButtonType.OVERFLOW,
        handler: action('delete clicked'),
      },
    ],
    onClose: action('close'),
  },
};

export const PreviewAvailable: Story = {
  args: {
    icon: 'document',
    title: 'dashboard.json',
    subtitle: 'Read-only preview available',
    actionButtons: [secondaryAction, primaryAction],
    previewBadgeState: 'preview_available',
    onClose: action('close'),
  },
};

export const Previewing: Story = {
  args: {
    icon: 'document',
    title: 'dashboard.json',
    subtitle: 'Currently previewing',
    actionButtons: [secondaryAction, primaryAction],
    previewBadgeState: 'previewing',
    onClose: action('close'),
    onClosePreview: action('close preview'),
  },
};

export const LongTitleTruncation: Story = {
  args: {
    icon: 'document',
    title: 'a-very-long-workflow-configuration-file-with-a-name-that-should-truncate-nicely.yaml',
    subtitle:
      'Also a very long subtitle that describes what the attachment contains and should truncate in the same way as the title.',
    actionButtons: [secondaryAction, primaryAction],
    onClose: action('close'),
  },
};

export const CompactWidth: Story = {
  args: {
    icon: 'document',
    title: 'workflow.yaml',
    subtitle: 'Compact width — actions collapse to icons',
    actionButtons: [secondaryAction, primaryAction],
    onClose: action('close'),
  },
  decorators: [
    (Story) => (
      <EuiSplitPanel.Outer grow hasShadow={false} hasBorder={true} style={{ maxWidth: 420 }}>
        {Story()}
      </EuiSplitPanel.Outer>
    ),
  ],
};
