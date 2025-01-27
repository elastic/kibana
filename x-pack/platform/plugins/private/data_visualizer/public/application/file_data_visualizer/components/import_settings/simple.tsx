/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';

import { EuiFieldText, EuiFormRow, EuiCheckbox, EuiSpacer } from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import type { CombinedField } from '../../../common/components/combined_fields';
import { CombinedFieldsReadOnlyForm } from '../../../common/components/combined_fields';
import { CreateDataViewToolTip } from './create_data_view_tooltip';
import { SemanticTextInfo } from './semantic_text_info';

interface Props {
  index: string;
  initialized: boolean;
  onIndexChange(i: string): void;
  createDataView: boolean;
  onCreateDataViewChange(): void;
  indexNameError: string;
  combinedFields: CombinedField[];
  canCreateDataView: boolean;
  results: FindFileStructureResponse;
}

export const SimpleSettings: FC<Props> = ({
  index,
  initialized,
  onIndexChange,
  createDataView,
  onCreateDataViewChange,
  indexNameError,
  combinedFields,
  canCreateDataView,
  results,
}) => {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.dataVisualizer.file.simpleImportSettings.indexNameFormRowLabel"
            defaultMessage="Index name"
          />
        }
        isInvalid={indexNameError !== ''}
        error={[indexNameError]}
      >
        <EuiFieldText
          placeholder={i18n.translate(
            'xpack.dataVisualizer.file.simpleImportSettings.indexNamePlaceholder',
            {
              defaultMessage: 'index name',
            }
          )}
          value={index}
          disabled={initialized === true}
          onChange={(e) => onIndexChange(e.target.value)}
          isInvalid={indexNameError !== ''}
          aria-label={i18n.translate(
            'xpack.dataVisualizer.file.simpleImportSettings.indexNameAriaLabel',
            {
              defaultMessage: 'Index name, required field',
            }
          )}
          data-test-subj="dataVisualizerFileIndexNameInput"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <CreateDataViewToolTip showTooltip={canCreateDataView === false}>
        <EuiCheckbox
          id="createDataView"
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.simpleImportSettings.createDataViewLabel"
              defaultMessage="Create data view"
            />
          }
          checked={createDataView === true}
          disabled={initialized === true || canCreateDataView === false}
          onChange={onCreateDataViewChange}
          data-test-subj="dataVisualizerFileCreateDataViewCheckbox"
        />
      </CreateDataViewToolTip>

      <SemanticTextInfo results={results} />

      <CombinedFieldsReadOnlyForm combinedFields={combinedFields} />
    </React.Fragment>
  );
};
