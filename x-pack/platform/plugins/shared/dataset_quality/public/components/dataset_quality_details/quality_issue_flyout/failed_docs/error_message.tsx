/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExpandableTruncatedText } from '../expandable_truncated_text';

const MAX_CHAR_LENGTH = 200;
const TRUNCATED_TEXT_LENGTH = 28;

export const ErrorMessage = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <ExpandableTruncatedText
      text={errorMessage}
      maxCharLength={MAX_CHAR_LENGTH}
      truncatedTextLength={TRUNCATED_TEXT_LENGTH}
      codeLanguage="js"
    />
  );
};
