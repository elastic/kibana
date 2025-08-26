/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useCallback } from 'react';
import { EuiRadioGroup, EuiSpacer, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFileUploadContext, UPLOAD_TYPE } from '@kbn/file-upload';
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
    setExistingIndexName,
  } = useFileUploadContext();
  const setSelectedOptions = useCallback(
    (selected: any[]) => {
      if (setExistingIndexName === undefined) {
        return;
      }
      setExistingIndexName(selected.length > 0 ? selected[0].label : null);
    },
    [setExistingIndexName]
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
        <>
          <EuiRadioGroup
            options={[
              {
                id: UPLOAD_TYPE.NEW,
                label: i18n.translate('xpack.dataVisualizer.file.indexSelection.newLabel', {
                  defaultMessage: 'Create new index',
                }),
              },
              {
                id: UPLOAD_TYPE.EXISTING,
                label: i18n.translate('xpack.dataVisualizer.file.existingIndexSelection.label', {
                  defaultMessage: 'Upload to existing index',
                }),
              },
            ]}
            idSelected={indexCreateMode}
            onChange={(id) => setIndexCreateMode(id as UPLOAD_TYPE)}
            name="indexCreateMode"
          />

          <EuiSpacer />

          {indexCreateMode === UPLOAD_TYPE.NEW ? (
            <IndexInput
              setIndexName={setIndexName}
              setIndexValidationStatus={setIndexValidationStatus}
            />
          ) : (
            <EuiComboBox
              placeholder={i18n.translate('xpack.dataVisualizer.file.existingIndexSelect.label', {
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
              compressed
            />
          )}
        </>
      ) : (
        <IndexInput
          setIndexName={setIndexName}
          setIndexValidationStatus={setIndexValidationStatus}
        />
      )}
    </>
  );
};
