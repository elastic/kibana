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
import type { AnalyzedFile } from './file_manager/file_wrapper';
import type { UploadStatus } from './file_manager/file_manager';

interface Props {
  uploadStatus: UploadStatus;
  filesStatus: AnalyzedFile[];
}

export const MappingClashWarning: FC<Props> = ({ uploadStatus, filesStatus }) => {
  const fileClashes = uploadStatus.fileClashes;
  // eslint-disable-next-line no-console
  console.log('fileClashes', fileClashes);

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.dataVisualizer.file.importSummary.documentsCouldNotBeImportedTitle"
            defaultMessage="Incompatible mappings"
          />
        }
        color="warning"
      >
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
