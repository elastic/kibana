/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiFilePickerProps } from '@elastic/eui';
import { EuiFormRow, EuiFilePicker, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EuiFilePickerClass } from '@elastic/eui/src/components/form/file_picker/file_picker';
import type { FileUploadManager } from '@kbn/file-upload';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useCallback, useRef } from 'react';

interface Props {
  fileUploadManager: FileUploadManager;
  fullWidth?: boolean;
  large?: boolean;
}

export const FilePicker: FC<Props> = ({ fileUploadManager, fullWidth, large = false }) => {
  const filePickerRef = useRef<EuiFilePickerClass>(null);

  const onFilePickerChange = useCallback(
    async (files: FileList | null) => {
      if (files && files.length > 0) {
        await fileUploadManager.addFiles(files);
        // Clear the file picker after adding files
        filePickerRef.current?.removeFiles();
      }
    },
    [fileUploadManager]
  );

  return (
    <EuiFlexGroup gutterSize="none">
      {fullWidth === false ? <EuiFlexItem grow={true} /> : null}
      <EuiFlexItem>
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
            display={large ? 'large' : 'default'}
            compressed={true}
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
      </EuiFlexItem>
      {fullWidth === false ? <EuiFlexItem grow={true} /> : null}
    </EuiFlexGroup>
  );
};
