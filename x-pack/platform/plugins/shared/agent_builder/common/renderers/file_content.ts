/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const FILE_CONTENT_RENDERER_TYPE = 'file_content' as const;

export const fileContentPayloadSchema = z.object({
  file_path: z
    .string()
    .startsWith('/workspace/')
    .describe('Absolute workspace path of the file to render. Must start with "/workspace/".'),
  language: z
    .string()
    .optional()
    .describe(
      'Optional syntax-highlighting language override. Inferred from the file extension when omitted.'
    ),
});

export type FileContentPayload = z.infer<typeof fileContentPayloadSchema>;

/**
 * Maps a lowercased file extension (no dot) to the language hint the renderer
 * uses. The value `'markdown'` triggers rendered-markdown mode; every other
 * value is passed straight to `EuiCodeBlock`'s `language` prop.
 */
export const extensionToLanguage: Readonly<Record<string, string>> = {
  md: 'markdown',
  mdx: 'markdown',
  json: 'json',
  jsonc: 'json',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  py: 'python',
  html: 'html',
  css: 'css',
  xml: 'xml',
  sql: 'sql',
};

export const getLanguageFromFilePath = (filePath: string): string | undefined => {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot < 0 || lastDot === filePath.length - 1) {
    return undefined;
  }
  const ext = filePath.slice(lastDot + 1).toLowerCase();
  return extensionToLanguage[ext];
};
