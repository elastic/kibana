/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiCallOut, EuiSplitPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { AB_PANEL_RADIUS } from '../../../../../../common.styles';
import { AttachmentHeader } from './attachment_header';
import { AttachmentLoadingSkeleton } from './attachment_loading_skeleton';
import { AttachmentRenderErrorBoundary } from './attachment_render_error_boundary';

interface ShellArgs {
  icon?: string;
  title: string;
  subtitle?: string;
  badges?: HeaderBadge[];
  body: React.ReactNode;
  actionButtons?: React.ComponentProps<typeof AttachmentHeader>['actionButtons'];
  previewBadgeState?: React.ComponentProps<typeof AttachmentHeader>['previewBadgeState'];
}

const Shell: React.FC<ShellArgs> = ({
  icon,
  title,
  subtitle,
  badges,
  body,
  actionButtons,
  previewBadgeState,
}) => (
  <EuiSplitPanel.Outer
    grow
    hasShadow={false}
    hasBorder={true}
    css={css`
      overflow: visible;
      border-radius: ${AB_PANEL_RADIUS}px;
      max-width: 820px;
    `}
  >
    <AttachmentHeader
      icon={icon}
      title={title}
      subtitle={subtitle}
      badges={badges}
      actionButtons={actionButtons}
      previewBadgeState={previewBadgeState}
      onClosePreview={action('close preview')}
    />
    <EuiSplitPanel.Inner grow={false} paddingSize="none">
      <AttachmentRenderErrorBoundary>{() => body}</AttachmentRenderErrorBoundary>
    </EuiSplitPanel.Inner>
  </EuiSplitPanel.Outer>
);

const bodyPlaceholder = (
  <div style={{ padding: 16 }}>
    <EuiText size="s" color="subdued">
      <em>
        Attachment body placeholder — real content is contributed by each attachment type&apos;s own
        renderer and is intentionally out of scope for this Storybook (see search-team#15189).
      </em>
    </EuiText>
  </div>
);

const emptyBody = (
  <div style={{ padding: 16, textAlign: 'center' }}>
    <EuiText size="s" color="subdued">
      Nothing to display.
    </EuiText>
  </div>
);

const errorBody = (
  <div style={{ padding: 8 }}>
    <EuiCallOut
      title="Couldn't render this attachment"
      color="warning"
      iconType="warning"
      size="s"
    />
  </div>
);

const defaultActions = [
  {
    label: 'Copy',
    icon: 'copy',
    type: ActionButtonType.SECONDARY,
    handler: action('copy'),
  },
  {
    label: 'Open',
    icon: 'expand',
    type: ActionButtonType.PRIMARY,
    handler: action('open'),
  },
];

const meta: Meta<typeof Shell> = {
  title: 'Agent Builder Attachment Cards/Card Shell',
  component: Shell,
};
export default meta;

type Story = StoryObj<typeof Shell>;

export const Default: Story = {
  args: {
    icon: 'document',
    title: 'workflow.yaml',
    actionButtons: defaultActions,
    body: bodyPlaceholder,
  },
};

export const WithSubtitle: Story = {
  args: {
    icon: 'document',
    title: 'workflow.yaml',
    subtitle: 'Managed workflow • updated 2 minutes ago',
    actionButtons: defaultActions,
    body: bodyPlaceholder,
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
    actionButtons: defaultActions,
    body: bodyPlaceholder,
  },
};

export const WithOverflowActions: Story = {
  args: {
    icon: 'document',
    title: 'workflow.yaml.diff',
    subtitle: '+42 −17 lines',
    actionButtons: [
      ...defaultActions,
      {
        label: 'Save to library',
        icon: 'save',
        type: ActionButtonType.OVERFLOW,
        handler: action('save'),
      },
      {
        label: 'Delete',
        icon: 'trash',
        type: ActionButtonType.OVERFLOW,
        handler: action('delete'),
      },
    ],
    body: bodyPlaceholder,
  },
};

export const EmptyState: Story = {
  args: {
    icon: 'document',
    title: 'empty.yaml',
    actionButtons: defaultActions,
    body: emptyBody,
  },
};

export const RenderError: Story = {
  args: {
    icon: 'document',
    title: 'broken.yaml',
    actionButtons: defaultActions,
    body: errorBody,
  },
};

export const PreviewAvailable: Story = {
  args: {
    icon: 'document',
    title: 'dashboard.json',
    subtitle: 'Read-only preview available',
    actionButtons: defaultActions,
    previewBadgeState: 'preview_available',
    body: bodyPlaceholder,
  },
};

export const Previewing: Story = {
  args: {
    icon: 'document',
    title: 'dashboard.json',
    subtitle: 'Currently previewing',
    actionButtons: defaultActions,
    previewBadgeState: 'previewing',
    body: bodyPlaceholder,
  },
};

export const LoadingSkeleton: Story = {
  render: () => (
    <div style={{ maxWidth: 820 }}>
      <AttachmentLoadingSkeleton />
    </div>
  ),
};

export const LongTitleTruncation: Story = {
  args: {
    icon: 'document',
    title: 'a-very-long-workflow-configuration-file-with-a-name-that-should-truncate-nicely.yaml',
    subtitle:
      'Also a very long subtitle that describes what the attachment contains and should truncate in the same way as the title.',
    actionButtons: defaultActions,
    body: bodyPlaceholder,
  },
};
