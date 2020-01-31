/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import {
  EuiFieldText,
  EuiSpacer,
  EuiFormRow,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { MLJobEditor, EDITOR_MODE } from '../../../../jobs/jobs_list/components/ml_job_editor';
const EDITOR_HEIGHT = '300px';

function AdvancedSettingsUi({
  index,
  indexPattern,
  initialized,
  onIndexChange,
  createIndexPattern,
  onCreateIndexPatternChange,
  onIndexPatternChange,
  indexSettingsString,
  mappingsString,
  pipelineString,
  onIndexSettingsStringChange,
  onMappingsStringChange,
  onPipelineStringChange,
  indexNameError,
  indexPatternNameError,
  intl,
}) {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.indexNameLabel"
            defaultMessage="Index name"
          />
        }
        isInvalid={indexNameError !== ''}
        error={[indexNameError]}
      >
        <EuiFieldText
          placeholder={intl.formatMessage({
            id: 'xpack.ml.fileDatavisualizer.advancedImportSettings.indexNamePlaceholder',
            defaultMessage: 'index name',
          })}
          value={index}
          disabled={initialized === true}
          onChange={onIndexChange}
          isInvalid={indexNameError !== ''}
          aria-label={intl.formatMessage({
            id: 'xpack.ml.fileDatavisualizer.advancedImportSettings.indexNameAriaLabel',
            defaultMessage: 'Index name, required field',
          })}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiCheckbox
        id="createIndexPattern"
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.createIndexPatternLabel"
            defaultMessage="Create index pattern"
          />
        }
        checked={createIndexPattern === true}
        disabled={initialized === true}
        onChange={onCreateIndexPatternChange}
      />

      <EuiSpacer size="s" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.indexPatternNameLabel"
            defaultMessage="Index pattern name"
          />
        }
        disabled={createIndexPattern === false || initialized === true}
        isInvalid={indexPatternNameError !== ''}
        error={[indexPatternNameError]}
      >
        <EuiFieldText
          disabled={createIndexPattern === false || initialized === true}
          placeholder={createIndexPattern === true ? index : ''}
          value={indexPattern}
          onChange={onIndexPatternChange}
          isInvalid={indexPatternNameError !== ''}
        />
      </EuiFormRow>

      <EuiFlexGroup>
        <EuiFlexItem>
          <IndexSettings
            initialized={initialized}
            data={indexSettingsString}
            onChange={onIndexSettingsStringChange}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <Mappings
            initialized={initialized}
            data={mappingsString}
            onChange={onMappingsStringChange}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <IngestPipeline
            initialized={initialized}
            data={pipelineString}
            onChange={onPipelineStringChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </React.Fragment>
  );
}

export const AdvancedSettings = injectI18n(AdvancedSettingsUi);

function IndexSettings({ initialized, data, onChange }) {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.indexSettingsLabel"
            defaultMessage="Index settings"
          />
        }
        disabled={initialized === true}
        fullWidth
      >
        <MLJobEditor
          mode={EDITOR_MODE.JSON}
          readOnly={initialized === true}
          value={data}
          height={EDITOR_HEIGHT}
          syntaxChecking={false}
          onChange={onChange}
        />
      </EuiFormRow>
    </React.Fragment>
  );
}

function Mappings({ initialized, data, onChange }) {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.mappingsLabel"
            defaultMessage="Mappings"
          />
        }
        disabled={initialized === true}
        fullWidth
      >
        <MLJobEditor
          mode={EDITOR_MODE.JSON}
          readOnly={initialized === true}
          value={data}
          height={EDITOR_HEIGHT}
          syntaxChecking={false}
          onChange={onChange}
        />
      </EuiFormRow>
    </React.Fragment>
  );
}

function IngestPipeline({ initialized, data, onChange }) {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.ingestPipelineLabel"
            defaultMessage="Ingest pipeline"
          />
        }
        disabled={initialized === true}
        fullWidth
      >
        <MLJobEditor
          mode={EDITOR_MODE.JSON}
          readOnly={initialized === true}
          value={data}
          height={EDITOR_HEIGHT}
          syntaxChecking={false}
          onChange={onChange}
        />
      </EuiFormRow>
    </React.Fragment>
  );
}
