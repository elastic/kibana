/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiFilePickerProps } from '@elastic/eui';
import { EuiFormRow, EuiFilePicker, EuiSpacer } from '@elastic/eui';
import type { EuiFilePickerClass } from '@elastic/eui/src/components/form/file_picker/file_picker';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useCallback, useRef } from 'react';
import type { FileManager } from './file_manager';

interface Props {
  fileManager: FileManager;
}

export const FilePicker: FC<Props> = ({ fileManager: fm }) => {
  const filePickerRef = useRef<EuiFilePickerClass>(null);

  const onFilePickerChange = useCallback(
    async (files: FileList | null) => {
      if (files && files.length > 0) {
        await fm.addFiles(files);
        // Clear the file picker after adding files
        filePickerRef.current?.removeFiles();
      }
    },
    [fm]
  );

  return (
    <>
      <EuiFormRow
        fullWidth
        helpText={i18n.translate(
          'xpack.dataVisualizer.file.aboutPanel.supportedFormatsDescription',
          {
            defaultMessage: 'Supported formats: PDF, TXT, CSV, log files and NDJSON',
          }
        )}
      >
        <EuiFilePicker
          ref={filePickerRef as React.Ref<Omit<EuiFilePickerProps, 'stylesMemoizer'>>}
          id="filePicker"
          fullWidth
          display="large"
          compressed
          multiple
          initialPromptText={i18n.translate(
            'xpack.dataVisualizer.file.filePicker.selectOrDragAndDropFiles',
            {
              defaultMessage: 'Select or drag and drop files',
            }
          )}
          onChange={(files) => onFilePickerChange(files)}
        />
      </EuiFormRow>
      <EuiSpacer />
    </>
  );
};
