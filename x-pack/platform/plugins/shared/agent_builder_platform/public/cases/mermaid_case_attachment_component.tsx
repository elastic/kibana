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
import type { UnifiedValueAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';

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
      const id = `mermaid-case-diagram-${mermaidIdCounter}`;
      const { svg } = await mermaid.render(id, content);
      setSvgContent(svg);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : i18n.translate('xpack.agentBuilderPlatform.cases.mermaid.renderError', {
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

interface MermaidCaseData {
  content: string;
  title?: string;
}

export const MermaidCaseAttachment: React.FC<UnifiedValueAttachmentViewProps> = ({ data }) => {
  const { content, title } = data as unknown as MermaidCaseData;

  if (!content || typeof content !== 'string') {
    return (
      <EuiText color="subdued" size="s">
        {i18n.translate('xpack.agentBuilderPlatform.cases.mermaid.noContent', {
          defaultMessage: 'No diagram content available',
        })}
      </EuiText>
    );
  }

  return (
    <div
      css={css`
        width: 100%;
        padding: 16px;
      `}
    >
      {title && (
        <>
          <EuiText size="m">
            <h3>{title}</h3>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      <MermaidDiagram content={content} />
      <EuiSpacer size="m" />
      <EuiAccordion
        id="mermaid-case-source"
        buttonContent={i18n.translate('xpack.agentBuilderPlatform.cases.mermaid.sourceLabel', {
          defaultMessage: 'Diagram source',
        })}
      >
        <EuiSpacer size="s" />
        <EuiCodeBlock language="text" fontSize="s" overflowHeight={300} lineNumbers>
          {content}
        </EuiCodeBlock>
      </EuiAccordion>
    </div>
  );
};
