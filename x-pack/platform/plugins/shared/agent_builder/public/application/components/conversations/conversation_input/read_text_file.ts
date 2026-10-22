/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_TEXT_FILE_LENGTH } from './file_type';

export type ReadTextFileResult =
  | { status: 'done'; content: string }
  | { status: 'failed'; message: string };

const labels = {
  notUtf8: i18n.translate('xpack.agentBuilder.readTextFile.notUtf8', {
    defaultMessage: 'The file must be UTF-8 text.',
  }),
  textTooLong: i18n.translate('xpack.agentBuilder.readTextFile.textTooLong', {
    defaultMessage: 'The text of the file is too long. Try a smaller file.',
  }),
};

const NUL_CHARACTER = '\u0000';

/** Reads a file as strict UTF-8 text. Never throws. */
export const readTextFile = async (file: File): Promise<ReadTextFileResult> => {
  let content: string;
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    return { status: 'failed', message: labels.notUtf8 };
  }
  if (content.includes(NUL_CHARACTER)) return { status: 'failed', message: labels.notUtf8 };
  if (content.length > MAX_TEXT_FILE_LENGTH) {
    return { status: 'failed', message: labels.textTooLong };
  }
  return { status: 'done', content };
};
