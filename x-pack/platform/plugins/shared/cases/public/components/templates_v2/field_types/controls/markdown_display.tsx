/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import React from 'react';
import { EuiMarkdownFormat } from '@elastic/eui';
import type { MarkdownFieldSchema } from '../../../../../common/types/domain/template/fields';

type MarkdownDisplayProps = z.infer<typeof MarkdownFieldSchema>;

/**
 * Renders authored markdown as formatted, read-only text (e.g. instructions on a case). This is a
 * display-only field: it takes no user input and stores no value in `extended_fields`.
 */
export const MarkdownDisplay = ({ name, metadata }: MarkdownDisplayProps) => (
  <EuiMarkdownFormat data-test-subj={`template-field-markdown-display-${name}`} textSize="s">
    {metadata.content}
  </EuiMarkdownFormat>
);
MarkdownDisplay.displayName = 'MarkdownDisplay';
