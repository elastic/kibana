/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { MessageAttachment } from '@kbn/observability-ai-assistant-plugin/common';
import { EuiImage } from '@elastic/eui';

export function AttachmentPreview({ attachment }: { attachment: MessageAttachment }) {
  return <EuiImage url={attachment.source.data} alt={attachment.title} size="l" />;
}
