/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';

const SELECT_FILE_LABEL = i18n.translate('xpack.canvas.fileUpload.filePickerAriaLabel', {
  defaultMessage: 'Select or drag and drop a file',
});

interface Props {
  /** Optional ID of the component */
  id?: string;
  /** Optional className of the component */
  className?: string;
  /** Function to invoke when the file is successfully uploaded */
  onUpload: () => void;
}

export const FileUpload: FunctionComponent<Props> = ({
  id = '',
  className = 'canvasFileUpload',
  onUpload,
}) => (
  <EuiFilePicker
    aria-label={SELECT_FILE_LABEL}
    initialPromptText={SELECT_FILE_LABEL}
    compressed
    id={id}
    className={className}
    onChange={onUpload}
  />
);

FileUpload.displayName = 'FileUpload';
