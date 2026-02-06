/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import useMountedState from 'react-use/lib/useMountedState';
import { FormattedMessage } from '@kbn/i18n-react';
import { STATUS } from '../../../../file_upload_manager';
import { useFileUploadKibana } from '../../kibana_context';

const existsErrorText = i18n.translate(
  'xpack.fileUpload.importView.indexNameAlreadyExistsErrorMessage',
  {
    defaultMessage: 'Index name already exists',
  }
);

const permissionErrorText = i18n.translate(
  'xpack.fileUpload.importView.indexNameNoPermissionErrorMessage',
  {
    defaultMessage: 'You do not have permission to create this index',
  }
);

interface Props {
  setIndexName: (name: string) => void;
  setIndexValidationStatus: (status: STATUS) => void;
  initialIndexName?: string;
}

export const IndexInput: FC<Props> = ({
  setIndexName,
  setIndexValidationStatus,
  initialIndexName,
}) => {
  const {
    services: { fileUpload },
  } = useFileUploadKibana();

  const [indexNameLocal, setIndexNameLocal] = useState(initialIndexName ?? '');
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

      const indexNameValid = isIndexNameValid(indexNameLocal);
      if (indexNameValid.error) {
        setIndexNameError(indexNameValid.error);
        return;
      }

      const [exists, canImport] = await Promise.all([
        fileUpload.checkIndexExists(indexNameLocal),
        fileUpload.hasImportPermission({
          checkCreateDataView: false,
          checkHasManagePipeline: true,
          indexName: indexNameLocal,
        }),
      ]);

      if (!isMounted()) {
        return;
      }

      setIndexName(indexNameLocal);

      if (canImport === false) {
        setIndexNameError(permissionErrorText);
        setIndexValidationStatus(STATUS.FAILED);
        return;
      }

      if (exists) {
        setIndexNameError(existsErrorText);
        setIndexValidationStatus(STATUS.FAILED);
        return;
      }

      setIndexNameError('');
      setIndexValidationStatus(STATUS.COMPLETED);
    },
    250,
    [indexNameLocal]
  );

  return (
    <EuiFormRow
      label={
        <EuiTitle size="xxxs">
          <h6>
            <FormattedMessage
              id="xpack.dataVisualizer.file.importView.indexNameLabel"
              defaultMessage="Index name"
            />
          </h6>
        </EuiTitle>
      }
      isInvalid={indexNameError !== ''}
      error={indexNameError}
      fullWidth
      helpText={i18n.translate(
        'xpack.fileUpload.importView.indexNameContainsIllegalCharactersErrorMessage',
        {
          defaultMessage: 'Index names must be lowercase and can only contain hyphens and numbers.',
        }
      )}
    >
      <EuiFieldText
        isInvalid={indexNameError !== ''}
        fullWidth
        value={indexNameLocal}
        onChange={(e) => setIndexNameLocal(e.target.value)}
        data-test-subj="dataVisualizerFileIndexNameInput"
        placeholder={i18n.translate(
          'xpack.fileUpload.importView.indexNameContainsIllegalCharactersErrorMessage',
          {
            defaultMessage: 'Enter an index name',
          }
        )}
      />
    </EuiFormRow>
  );
};

function isIndexNameValid(name: string): { valid: boolean; error?: string } {
  const reg = new RegExp('[\\\\/*?"<>|\\s,#]+');
  if (
    name !== name.toLowerCase() || // name should be lowercase
    name === '.' ||
    name === '..' || // name can't be . or ..
    name.match(/^[-_+]/) !== null || // name can't start with these chars
    name.match(reg) !== null // name can't contain these chars
  ) {
    return {
      valid: false,
      error: i18n.translate(
        'xpack.fileUpload.importView.indexNameContainsIllegalCharactersErrorMessage',
        {
          defaultMessage: 'Index name contains illegal characters',
        }
      ),
    };
  }
  return { valid: true };
}
