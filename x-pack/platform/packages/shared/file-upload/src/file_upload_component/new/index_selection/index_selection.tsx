/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useCallback } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiSpacer,
  EuiComboBox,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useFileUploadContext, UPLOAD_TYPE } from '../../../use_file_upload';
import { IndexInput } from './index_input';

interface Props {
  allowExistingIndices?: boolean;
}

export const IndexSelection: FC<Props> = ({ allowExistingIndices = true }) => {
  const {
    setIndexName,
    setIndexValidationStatus,
    indexCreateMode,
    setIndexCreateMode,
    indices,
    existingIndexName,
    fileUploadManager,
  } = useFileUploadContext();
  const setSelectedOptions = useCallback(
    (selected: EuiComboBoxOptionOption<string>[]) => {
      fileUploadManager.setExistingIndexName(selected.length > 0 ? selected[0].label : null);
    },
    [fileUploadManager]
  );

  const setIndexCreateModeWrapper = useCallback(
    (mode: UPLOAD_TYPE) => {
      setIndexCreateMode(mode);
      if (mode === UPLOAD_TYPE.NEW) {
        fileUploadManager.setExistingIndexName(null);
      }
    },
    [setIndexCreateMode, fileUploadManager]
  );

  const selectedOptions = useMemo(() => {
    if (existingIndexName === null) {
      return [];
    }

    return indices
      .filter((index) => index.name === existingIndexName)
      .map((index) => ({
        label: index.name,
        value: index.name,
      }));
  }, [existingIndexName, indices]);

  return (
    <>
      {allowExistingIndices === true ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButtonGroup
              legend={i18n.translate('xpack.fileUpload.indexSelection.label', {
                defaultMessage: 'Select index creation method',
              })}
              isFullWidth={true}
              isDisabled={false}
              options={[
                {
                  id: UPLOAD_TYPE.NEW,
                  label: i18n.translate('xpack.fileUpload.indexSelection.newLabel', {
                    defaultMessage: 'New index',
                  }),
                },
                {
                  id: UPLOAD_TYPE.EXISTING,
                  label: i18n.translate('xpack.fileUpload.existingIndexSelection.label', {
                    defaultMessage: 'Existing index',
                  }),
                },
              ]}
              idSelected={indexCreateMode}
              onChange={(id) => setIndexCreateModeWrapper(id as UPLOAD_TYPE)}
            />

            <EuiSpacer size="m" />

            {indexCreateMode === UPLOAD_TYPE.NEW ? (
              <IndexInput
                setIndexName={setIndexName}
                setIndexValidationStatus={setIndexValidationStatus}
              />
            ) : (
              <>
                <EuiFormRow
                  label={i18n.translate('xpack.fileUpload.importView.selectExistingIndexLabel', {
                    defaultMessage: 'Select existing index',
                  })}
                  fullWidth
                >
                  <EuiComboBox
                    placeholder={i18n.translate('xpack.fileUpload.existingIndexSelect.label', {
                      defaultMessage: 'Select an index',
                    })}
                    options={indices.map((index) => ({
                      label: index.name,
                      value: index.name,
                    }))}
                    selectedOptions={selectedOptions}
                    onChange={(selected) => {
                      setSelectedOptions(selected);
                    }}
                    singleSelection={{ asPlainText: true }}
                    data-test-subj="defaultEditorAggSelect"
                    isClearable={false}
                    sortMatchesBy="startsWith"
                    fullWidth={true}
                  />
                </EuiFormRow>
              </>
            )}
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      ) : (
        <IndexInput
          setIndexName={setIndexName}
          setIndexValidationStatus={setIndexValidationStatus}
        />
      )}
    </>
  );
};
