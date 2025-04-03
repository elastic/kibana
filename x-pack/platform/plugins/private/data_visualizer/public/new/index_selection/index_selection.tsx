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
import type { Index } from '@kbn/index-management-shared-types/src/types';
import type { STATUS } from '../file_manager/file_manager';
import { IndexInput } from './index_input';
import { UPLOAD_TYPE } from '../use_file_upload';

interface Props {
  setIndexName: (name: string) => void;
  setIndexValidationStatus: (status: STATUS) => void;
  initialIndexName?: string;
  indexCreateMode?: string;
  setIndexCreateMode?: (mode: UPLOAD_TYPE) => void;
  indices: Index[];
  existingIndexName?: string | null;
  setExistingIndexName?: (name: string | null) => void;
}

export const IndexSelection: FC<Props> = ({
  setIndexName,
  setIndexValidationStatus,
  initialIndexName, // / is this needed?!!!!!!!!!!!
  indexCreateMode,
  setIndexCreateMode,
  indices,
  existingIndexName,
  setExistingIndexName,
}) => {
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
      {indexCreateMode !== undefined && setIndexCreateMode !== undefined ? (
        <>
          <EuiRadioGroup
            options={[
              {
                id: UPLOAD_TYPE.NEW,
                label: i18n.translate('xpack.ml.timeSeriesExplorer.newOptionsOrderLabel', {
                  defaultMessage: 'Create new index',
                }),
              },
              {
                id: UPLOAD_TYPE.EXISTING,
                label: i18n.translate('xpack.ml.timeSeriesExplorer.existingOptionsOrderLabel', {
                  defaultMessage: 'Upload to existing index',
                }),
              },
            ]}
            idSelected={indexCreateMode}
            onChange={(id) => setIndexCreateMode(id as UPLOAD_TYPE)}
            name="radio group"
            // legend={{
            //   children: <span>This is a legend for a radio group</span>,
            // }}
          />

          <EuiSpacer />

          {indexCreateMode === UPLOAD_TYPE.NEW ? (
            <IndexInput
              setIndexName={setIndexName}
              setIndexValidationStatus={setIndexValidationStatus}
            />
          ) : (
            <EuiComboBox
              placeholder={i18n.translate('visDefaultEditor.aggSelect.selectAggPlaceholder', {
                defaultMessage: 'Select an aggregation',
              })}
              id={`visDefaultEditorAggSelect$`}
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
