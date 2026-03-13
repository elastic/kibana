/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiCodeBlock,
  EuiLoadingSpinner,
  EuiText,
  EuiAccordion,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { MermaidAttachment } from '@kbn/agent-builder-common/attachments';
import {
  ActionButtonType,
  type ActionButton,
  type AttachmentUIDefinition,
  type AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';
import { MERMAID_CASE_ATTACHMENT_TYPE } from '../../common/constants/cases';

let mermaidIdCounter = 0;

const MermaidDiagram: React.FC<{ content: string }> = ({ content }) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { colorMode } = useEuiTheme();

  const renderDiagram = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSvgContent(null);

    try {
      const mermaid = (await import('mermaid')).default;

      mermaid.initialize({
        startOnLoad: false,
        theme: colorMode === 'DARK' ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'Inter, system-ui, sans-serif',
      });

      mermaidIdCounter += 1;
      const id = `mermaid-diagram-${mermaidIdCounter}`;
      const { svg } = await mermaid.render(id, content);
      setSvgContent(svg);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.renderError', {
              defaultMessage: 'Failed to render mermaid diagram',
            })
      );
    } finally {
      setLoading(false);
    }
  }, [content, colorMode]);

  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  if (loading) {
    return <EuiLoadingSpinner size="l" />;
  }

  if (error) {
    return (
      <EuiText color="danger" size="s">
        {error}
      </EuiText>
    );
  }

  if (!svgContent) {
    return null;
  }

  // Mermaid's render() output with securityLevel: 'strict' is sanitized via DOMPurify
  return (
    <div
      css={css`
        width: 100%;
        overflow: auto;
        & svg {
          max-width: 100%;
          height: auto;
        }
      `}
      dangerouslySetInnerHTML={{ __html: svgContent }} // eslint-disable-line react/no-danger
    />
  );
};

const MermaidInlineContent: React.FC<AttachmentRenderProps<MermaidAttachment>> = ({
  attachment,
}) => (
  <div
    css={css`
      width: 100%;
    `}
  >
    <MermaidDiagram content={attachment.data.content} />
  </div>
);

const MermaidCanvasContent: React.FC<AttachmentRenderProps<MermaidAttachment>> = ({
  attachment,
}) => (
  <div
    css={css`
      width: 100%;
      padding: 16px;
    `}
  >
    {attachment.data.title && (
      <>
        <EuiText size="m">
          <h3>{attachment.data.title}</h3>
        </EuiText>
        <EuiSpacer size="m" />
      </>
    )}
    <MermaidDiagram content={attachment.data.content} />
    <EuiSpacer size="m" />
    <EuiAccordion
      id="mermaid-source"
      buttonContent={i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.sourceLabel', {
        defaultMessage: 'Diagram source',
      })}
    >
      <EuiSpacer size="s" />
      <EuiCodeBlock
        language="text"
        fontSize="s"
        overflowHeight={300}
        lineNumbers
        css={css`
          width: 100%;
          & pre {
            margin-block-end: 0;
          }
        `}
      >
        {attachment.data.content}
      </EuiCodeBlock>
    </EuiAccordion>
  </div>
);

interface MermaidAttachmentFactoryDeps {
  http?: HttpStart;
  notifications?: NotificationsStart;
}

export const createMermaidAttachmentDefinition = ({
  http,
  notifications,
}: MermaidAttachmentFactoryDeps): AttachmentUIDefinition<MermaidAttachment> => {
  const addToCase = async (attachment: MermaidAttachment) => {
    if (!http) {
      return;
    }

    const { AddToCasePicker } = await import('./add_to_case_picker');
    const { default: ReactDOM } = await import('react-dom');

    const container = document.createElement('div');
    document.body.appendChild(container);

    const cleanup = () => {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    };

    ReactDOM.render(
      <AddToCasePicker
        http={http}
        notifications={notifications}
        mermaidContent={attachment.data.content}
        mermaidTitle={attachment.data.title}
        attachmentType={MERMAID_CASE_ATTACHMENT_TYPE}
        onClose={cleanup}
      />,
      container
    );
  };

  return {
    getLabel: (attachment) =>
      attachment.data.title ??
      i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.label', {
        defaultMessage: 'Mermaid diagram',
      }),
    getIcon: () => 'visVega',
    renderInlineContent: (props) => <MermaidInlineContent {...props} />,
    renderCanvasContent: (props) => <MermaidCanvasContent {...props} />,
    getActionButtons: ({ attachment, openCanvas }) => {
      const buttons: ActionButton[] = [
        {
          label: i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.copy', {
            defaultMessage: 'Copy',
          }),
          icon: 'copy',
          type: ActionButtonType.PRIMARY,
          handler: async () => {
            await navigator.clipboard.writeText(attachment.data.content);
          },
        },
      ];

      if (openCanvas) {
        buttons.push({
          label: i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.expand', {
            defaultMessage: 'Expand',
          }),
          icon: 'expand',
          type: ActionButtonType.SECONDARY,
          handler: openCanvas,
        });
      }

      if (http) {
        buttons.push({
          label: i18n.translate('xpack.agentBuilderPlatform.attachments.mermaid.addToCase', {
            defaultMessage: 'Add to case',
          }),
          icon: 'folderOpen',
          type: ActionButtonType.OVERFLOW,
          handler: () => {
            addToCase(attachment);
          },
        });
      }

      return buttons;
    },
  };
};
