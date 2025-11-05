/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFileUploadContext, CLASH_TYPE } from '@kbn/file-upload';

export const FileClashWarning: FC = () => {
  const { uploadStatus, fileUploadManager } = useFileUploadContext();
  const fileClashes = uploadStatus.fileClashes;

  const clashType = fileClashes.some((fileClash) => fileClash.clashType === CLASH_TYPE.FORMAT)
    ? CLASH_TYPE.FORMAT
    : fileClashes.some((fileClash) => fileClash.clashType === CLASH_TYPE.MAPPING)
    ? CLASH_TYPE.MAPPING
    : fileClashes.some((fileClash) => fileClash.clashType === CLASH_TYPE.EXISTING_INDEX_MAPPING)
    ? CLASH_TYPE.EXISTING_INDEX_MAPPING
    : CLASH_TYPE.UNSUPPORTED;

  const { title, description } =
    clashType === CLASH_TYPE.MAPPING
      ? {
          title: i18n.translate('xpack.dataVisualizer.file.fileClashWarning.mappingClashTitle', {
            defaultMessage: 'Incompatible mapping',
          }),
          description: i18n.translate(
            'xpack.dataVisualizer.file.fileClashWarning.mappingClashDescription',
            {
              defaultMessage: 'Mappings in the selected files are not compatible with each other',
            }
          ),
        }
      : clashType === CLASH_TYPE.FORMAT
      ? {
          title: i18n.translate('xpack.dataVisualizer.file.fileClashWarning.fileFormatClashTitle', {
            defaultMessage: 'Incompatible file formats',
          }),
          description: i18n.translate(
            'xpack.dataVisualizer.file.fileClashWarning.fileFormatClashDescription',
            {
              defaultMessage:
                'The selected files must have the same format. e.g. all CSV or all log files',
            }
          ),
        }
      : clashType === CLASH_TYPE.EXISTING_INDEX_MAPPING
      ? {
          title: i18n.translate(
            'xpack.dataVisualizer.file.fileClashWarning.existingIndexMappingClashTitle',
            {
              defaultMessage: 'Incompatible mapping',
            }
          ),
          description: i18n.translate(
            'xpack.dataVisualizer.file.fileClashWarning.existingIndexMappingClashDescription',
            {
              defaultMessage:
                'Mappings in the selected files are not compatible with the existing index',
            }
          ),
        }
      : {
          title: i18n.translate(
            'xpack.dataVisualizer.file.fileClashWarning.fileFormatNotSupportedTitle',
            {
              defaultMessage: 'File format not supported',
            }
          ),
          description: i18n.translate(
            'xpack.dataVisualizer.file.fileClashWarning.fileFormatNotSupportedDescription',
            {
              defaultMessage: 'Some of the selected files are not supported for upload.',
            }
          ),
        };

  return (
    <EuiCallOut title={title} color="danger">
      <p>{description}</p>
      <EuiButton
        onClick={() => fileUploadManager.removeClashingFiles()}
        color="danger"
        size="s"
        fill
      >
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileClashWarning.deleteAllButtonLabel"
          defaultMessage="Delete all"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
