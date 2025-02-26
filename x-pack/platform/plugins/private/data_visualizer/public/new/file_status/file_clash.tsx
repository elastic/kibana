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
import type { FileClash } from '../file_manager/merge_tools';
import { CLASH_TYPE } from '../file_manager/merge_tools';

interface Props {
  fileClash: FileClash;
}

export const FileClashResult: FC<Props> = ({ fileClash }) => {
  return fileClash.clash ? (
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
  ) : null;
};
