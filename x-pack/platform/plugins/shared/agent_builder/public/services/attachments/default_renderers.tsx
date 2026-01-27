/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import type { ReactNode } from 'react';
import type {
  AttachmentContentProps,
  AttachmentEditorProps,
} from '@kbn/agent-builder-browser/attachments';

/**
 * Minimal fallback renderer for unknown attachment types.
 * Displays the attachment version data as formatted JSON.
 */
export const DefaultJsonRenderer: React.FC<AttachmentContentProps> = ({ version }) => {
  return (
    <EuiCodeBlock language="json" paddingSize="m" fontSize="m" isCopyable>
      {JSON.stringify(version.data, null, 2)}
    </EuiCodeBlock>
  );
};

/**
 * Type definitions for render functions.
 */
export type RenderContentFn = (props: AttachmentContentProps) => ReactNode;
export type RenderEditorFn = (props: AttachmentEditorProps) => ReactNode;
