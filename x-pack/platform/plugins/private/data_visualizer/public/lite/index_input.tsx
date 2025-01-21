/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { FC } from 'react';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import { i18n } from '@kbn/i18n';
import { STATUS } from './file_manager/file_manager';

interface Props {
  setIndexName: (name: string) => void;
  setIndexValidationStatus: (status: STATUS) => void;
  fileUpload: FileUploadStartApi;
}

export const IndexInput: FC<Props> = ({ setIndexName, setIndexValidationStatus, fileUpload }) => {
  const [indexNameLocal, setIndexNameLocal] = useState('');
  const [indexNameError, setIndexNameError] = useState('');

  useDebounce(
    async () => {
      setIndexValidationStatus(STATUS.STARTED);
      if (indexNameLocal === '') {
        setIndexValidationStatus(STATUS.COMPLETED);
        setIndexNameError('');
        setIndexName('');
        return;
      }
      const exists = await fileUpload.checkIndexExists(indexNameLocal);
      const error = exists
        ? i18n.translate(
            'xpack.dataVisualizer.file.importView.indexNameAlreadyExistsErrorMessage',
            {
              defaultMessage: 'Index name already exists',
            }
          )
        : isIndexNameValid(indexNameLocal);
      setIndexName(indexNameLocal);
      setIndexNameError(error);
      setIndexValidationStatus(error === '' ? STATUS.COMPLETED : STATUS.FAILED);
    },
    250,
    [indexNameLocal]
  );

  return (
    <EuiFormRow
      label="Index name"
      isInvalid={indexNameError !== ''}
      error={indexNameError}
      fullWidth
    >
      <EuiFieldText
        fullWidth
        value={indexNameLocal}
        // disabled={
        //   uploadStatus.overallImportStatus === STATUS.STARTED ||
        //   uploadStatus.overallImportStatus === STATUS.COMPLETED
        // }
        onChange={(e) => setIndexNameLocal(e.target.value)}
        placeholder="Index name"
      />
    </EuiFormRow>
  );
};

function isIndexNameValid(name: string) {
  const reg = new RegExp('[\\\\/*?"<>|\\s,#]+');
  if (
    name !== name.toLowerCase() || // name should be lowercase
    name === '.' ||
    name === '..' || // name can't be . or ..
    name.match(/^[-_+]/) !== null || // name can't start with these chars
    name.match(reg) !== null // name can't contain these chars
  ) {
    return i18n.translate(
      'xpack.dataVisualizer.file.importView.indexNameContainsIllegalCharactersErrorMessage',
      {
        defaultMessage: 'Index name contains illegal characters',
      }
    );
  }
  return '';
}
