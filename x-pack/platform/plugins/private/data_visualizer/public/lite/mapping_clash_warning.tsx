/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { AnalyzedFile } from './file_manager/file_wrapper';
import type { UploadStatus } from './file_manager/file_manager';
import { CLASH_TYPE } from './file_manager/merge_tools';

interface Props {
  uploadStatus: UploadStatus;
  filesStatus: AnalyzedFile[];
}

export const FileClashWarning: FC<Props> = ({ uploadStatus, filesStatus }) => {
  const fileClashes = uploadStatus.fileClashes;
  // eslint-disable-next-line no-console
  console.log('fileClashes', fileClashes);
  const clashType = fileClashes.some((fileClash) => fileClash.clashType === CLASH_TYPE.FORMAT)
    ? CLASH_TYPE.FORMAT
    : fileClashes.some((fileClash) => fileClash.clashType === CLASH_TYPE.FORMAT)
    ? CLASH_TYPE.MAPPING
    : CLASH_TYPE.UNSUPPORTED;

  const title =
    clashType === CLASH_TYPE.MAPPING
      ? i18n.translate('xpack.dataVisualizer.file.aboutPanel.selectOrDragAndDropFileDescription', {
          defaultMessage: 'Incompatible mappings',
        })
      : clashType === CLASH_TYPE.FORMAT
      ? i18n.translate(
          'xpack.dataVisualizer.file.importSummary.documentsCouldNotBeImportedDescription',
          {
            defaultMessage: 'Incompatible file formats',
          }
        )
      : i18n.translate(
          'xpack.dataVisualizer.file.importSummary.documentsCouldNotBeImportedDescription',
          {
            defaultMessage: 'Unsupported file types',
          }
        );

  return (
    <>
      <EuiCallOut title={title} color="danger">
        <p>
          <FormattedMessage
            id="xpack.dataVisualizer.file.importSummary.documentsCouldNotBeImportedDescription"
            defaultMessage="The mappings for the selected files are incompatible with each other."
          />
        </p>
      </EuiCallOut>
    </>
  );
};
