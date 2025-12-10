/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPanel,
  EuiDescriptionList,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import type {
  AttachmentContentProps,
  AttachmentEditorProps,
} from '@kbn/onechat-browser/attachments';
import type {
  TextAttachmentData,
  EsqlAttachmentData,
  ScreenContextAttachmentData,
} from '@kbn/onechat-common/attachments';
import {
  TextAttachmentEditor,
  EsqlAttachmentEditor,
} from '../../application/components/attachment_viewer/editors';
import { VisualizationContentRenderer } from '../../application/components/attachment_viewer/renderers';

// Helper to extract content from attachment data
// Handles both { content: string } and raw string formats
const getTextContent = (data: unknown): string => {
  if (typeof data === 'string') {
    return data;
  }
  if (data && typeof data === 'object' && 'content' in data) {
    return (data as TextAttachmentData).content ?? '';
  }
  return '';
};

/**
 * Default content renderer for text attachments.
 * Displays text content in a code block with monospace font.
 */
export const TextContentRenderer: React.FC<AttachmentContentProps> = ({ version }) => {
  const content = getTextContent(version.data);

  return (
    <EuiCodeBlock language="text" paddingSize="m" fontSize="m" isCopyable>
      {content}
    </EuiCodeBlock>
  );
};

/**
 * Default editor for text attachments.
 * Uses the dedicated TextAttachmentEditor component.
 */
export const TextEditorRenderer: React.FC<AttachmentEditorProps> = (props) => {
  return <TextAttachmentEditor {...props} />;
};

/**
 * Default content renderer for ES|QL attachments.
 * Displays ES|QL query with syntax highlighting.
 */
export const EsqlContentRenderer: React.FC<AttachmentContentProps> = ({ version }) => {
  const data = version.data as EsqlAttachmentData;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {data.description && (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {data.description}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiCodeBlock language="esql" paddingSize="m" fontSize="m" isCopyable>
          {data.query}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Default editor for ES|QL attachments.
 * Uses the dedicated EsqlAttachmentEditor component.
 */
export const EsqlEditorRenderer: React.FC<AttachmentEditorProps> = (props) => {
  return <EsqlAttachmentEditor {...props} />;
};

/**
 * Default content renderer for screen context attachments.
 * Displays screen context as a description list (read-only).
 */
export const ScreenContextContentRenderer: React.FC<AttachmentContentProps> = ({ version }) => {
  const data = version.data as ScreenContextAttachmentData;

  const items: Array<{ title: string; description: string }> = [];

  if (data.url) {
    items.push({
      title: i18n.translate('xpack.onechat.attachments.screenContext.url', {
        defaultMessage: 'URL',
      }),
      description: data.url,
    });
  }

  if (data.app) {
    items.push({
      title: i18n.translate('xpack.onechat.attachments.screenContext.app', {
        defaultMessage: 'Application',
      }),
      description: data.app,
    });
  }

  if (data.description) {
    items.push({
      title: i18n.translate('xpack.onechat.attachments.screenContext.description', {
        defaultMessage: 'Description',
      }),
      description: data.description,
    });
  }

  if (data.additional_data) {
    Object.entries(data.additional_data).forEach(([key, value]) => {
      items.push({
        title: key,
        description: value,
      });
    });
  }

  return (
    <EuiPanel paddingSize="m" hasBorder>
      <EuiDescriptionList
        type="column"
        listItems={items}
        compressed
        style={{ maxWidth: '100%' }}
      />
    </EuiPanel>
  );
};

/**
 * Default fallback renderer for unknown attachment types.
 * Displays content as formatted JSON.
 */
export const DefaultJsonRenderer: React.FC<AttachmentContentProps> = ({ version }) => {
  return (
    <EuiCodeBlock language="json" paddingSize="m" fontSize="m" isCopyable>
      {JSON.stringify(version.data, null, 2)}
    </EuiCodeBlock>
  );
};

/**
 * Re-export visualization renderer for use in the service.
 */
export { VisualizationContentRenderer };

/**
 * Type definitions for render functions.
 */
export type RenderContentFn = (props: AttachmentContentProps) => ReactNode;
export type RenderEditorFn = (props: AttachmentEditorProps) => ReactNode;
