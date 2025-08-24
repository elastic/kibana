/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CLASH_ERROR_TYPE, CLASH_TYPE } from '@kbn/file-upload';
import type { FileClash } from '@kbn/file-upload/file_upload_manager';

interface Props {
  fileClash: FileClash;
}

export const FileClashResult: FC<Props> = ({ fileClash }) => {
  return fileClash.clash === CLASH_ERROR_TYPE.ERROR ? (
    <>
      {fileClash.clashType === CLASH_TYPE.FORMAT ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileStatus.fileFormatClash"
              defaultMessage="File format different from other files"
            />
          </EuiText>
        </>
      ) : null}

      {fileClash.clashType === CLASH_TYPE.MAPPING ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileStatus.mappingClash"
              defaultMessage="Mappings incompatible with other files"
            />
          </EuiText>
        </>
      ) : null}

      {fileClash.clashType === CLASH_TYPE.EXISTING_INDEX_MAPPING ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileStatus.existingIndexMappingClash"
              defaultMessage="Mappings incompatible with existing index"
            />
          </EuiText>
        </>
      ) : null}

      {fileClash.clashType === CLASH_TYPE.UNSUPPORTED ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="danger">
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileStatus.fileFormatNotSupported"
              defaultMessage="File format not supported"
            />
          </EuiText>
        </>
      ) : null}
    </>
  ) : (
    <>
      {fileClash.clash === CLASH_ERROR_TYPE.WARNING ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="warning">
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileStatus.fileClashWarning"
              defaultMessage="Mappings may be incompatible with the existing index"
            />
          </EuiText>
        </>
      ) : null}

      {fileClash.newFields?.length || fileClash.missingFields?.length ? (
        <EuiSpacer size="s" />
      ) : null}

      {fileClash.newFields?.length ? (
        <>
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileStatus.newFields"
              defaultMessage="File contains {count} new fields"
              values={{ count: fileClash.newFields.length }}
            />
          </EuiText>
        </>
      ) : null}

      {fileClash.missingFields?.length ? (
        <>
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileStatus.missingFields"
              defaultMessage="File is missing {count} fields which are present in the index"
              values={{ count: fileClash.missingFields.length }}
            />
          </EuiText>
        </>
      ) : null}
    </>
  );
};
