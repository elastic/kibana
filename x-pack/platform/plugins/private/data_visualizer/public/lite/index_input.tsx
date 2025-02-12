/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import type { FileUploadStartApi } from '@kbn/file-upload-plugin/public/api';
import { i18n } from '@kbn/i18n';
import useMountedState from 'react-use/lib/useMountedState';
import { FormattedMessage } from '@kbn/i18n-react';
import { STATUS } from './file_manager/file_manager';

interface Props {
  setIndexName: (name: string) => void;
  setIndexValidationStatus: (status: STATUS) => void;
  fileUpload: FileUploadStartApi;
}

export const IndexInput: FC<Props> = ({ setIndexName, setIndexValidationStatus, fileUpload }) => {
  const [indexNameLocal, setIndexNameLocal] = useState('');
  const [indexNameError, setIndexNameError] = useState('');
  const isMounted = useMountedState();

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

      if (!isMounted()) {
        return;
      }

      setIndexName(indexNameLocal);
      setIndexNameError(error);
      setIndexValidationStatus(error === '' ? STATUS.COMPLETED : STATUS.FAILED);
    },
    250,
    [indexNameLocal]
  );

  return (
    <>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.dataVisualizer.file.importView.createIndexTitle"
            defaultMessage="Create new index"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="xs" />

      <EuiFormRow
        label={i18n.translate('xpack.dataVisualizer.file.importView.indexNameLabel', {
          defaultMessage: 'Index name',
        })}
        isInvalid={indexNameError !== ''}
        error={indexNameError}
        fullWidth
        helpText={i18n.translate(
          'xpack.dataVisualizer.file.importView.indexNameContainsIllegalCharactersErrorMessage',
          {
            defaultMessage:
              'Index names must be lowercase and can only contain hyphens and numbers.',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          value={indexNameLocal}
          onChange={(e) => setIndexNameLocal(e.target.value)}
          placeholder={i18n.translate(
            'xpack.dataVisualizer.file.importView.indexNameContainsIllegalCharactersErrorMessage',
            {
              defaultMessage: 'Add name to index',
            }
          )}
        />
      </EuiFormRow>
    </>
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
