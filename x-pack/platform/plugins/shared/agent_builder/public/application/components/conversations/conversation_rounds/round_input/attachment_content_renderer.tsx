/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiIcon,
  EuiCodeBlock,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Attachment, AttachmentVersion } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';

/**
 * Fallback renderer for attachments without custom renderContent.
 */
const FallbackJsonRenderer: React.FC<{ version: AttachmentVersion }> = ({ version }) => (
  <EuiCodeBlock language="json" paddingSize="m" fontSize="m" isCopyable>
    {JSON.stringify(version.data, null, 2)}
  </EuiCodeBlock>
);

interface AttachmentContentRendererProps {
  attachment: Attachment;
}

/**
 * Renders the expanded content of an attachment using the registered UI definition.
 * Falls back to JSON rendering if no custom renderer is registered.
 */
export const AttachmentContentRenderer: React.FC<AttachmentContentRendererProps> = ({
  attachment,
}) => {
  const { attachmentsService } = useAgentBuilderServices();
  const { euiTheme } = useEuiTheme();

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
  const renderContent = attachmentsService.getRenderContent(attachment.type);

  const displayName = uiDefinition?.getLabel(attachment) ?? attachment.type;
  const iconType = uiDefinition?.getIcon?.() ?? 'document';

  // Get the current version for rendering
  const currentVersion: AttachmentVersion = useMemo(
    () => ({
      version: attachment.versions?.length ?? 1,
      data: attachment.data,
      createdAt: attachment.createdAt ?? new Date().toISOString(),
    }),
    [attachment]
  );

  const panelStyles = css`
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
    background: ${euiTheme.colors.backgroundBaseSubdued};
  `;

  const headerStyles = css`
    border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  const contentStyles = css`
    padding: ${euiTheme.size.m};
  `;

  return (
    <EuiPanel
      css={panelStyles}
      hasShadow={false}
      hasBorder={false}
      paddingSize="none"
      data-test-subj={`attachmentContentRenderer-${attachment.type}-${attachment.id}`}
    >
      <div css={headerStyles}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="m" color="primary" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{displayName}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div css={contentStyles}>
        {renderContent ? (
          renderContent({ attachment, version: currentVersion })
        ) : (
          <FallbackJsonRenderer version={currentVersion} />
        )}
      </div>
    </EuiPanel>
  );
};

interface AttachmentContentListProps {
  attachments: Attachment[];
}

/**
 * Renders a list of expanded attachment content.
 * Only renders attachments that have a custom renderContent defined.
 */
export const AttachmentContentList: React.FC<AttachmentContentListProps> = ({ attachments }) => {
  const { attachmentsService } = useAgentBuilderServices();

  // Filter to only show attachments with custom renderers
  const renderableAttachments = useMemo(() => {
    return attachments.filter((attachment) => {
      const definition = attachmentsService.getAttachmentUiDefinition(attachment.type);
      return definition?.renderContent != null && !attachment.hidden;
    });
  }, [attachments, attachmentsService]);

  if (renderableAttachments.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {renderableAttachments.map((attachment) => (
        <EuiFlexItem key={attachment.id} grow={false}>
          <AttachmentContentRenderer attachment={attachment} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
