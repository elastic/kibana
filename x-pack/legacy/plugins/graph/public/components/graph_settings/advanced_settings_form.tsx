/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiForm, EuiFormRow, EuiFieldNumber, EuiCheckbox, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GraphSettingsProps } from './graph_settings';
import { AdvancedSettings } from '../../types';

// Helper type to get all keys of an interface
// that are of type number.
// Used to parameterize the number updater function
// to make it impossible to pass in non-number keys
type NumberKeys<T> = Exclude<
  {
    [K in keyof T]: T[K] extends number ? K : never;
  }[keyof T],
  undefined
>;

export function AdvancedSettingsForm({
  advancedSettings,
  updateAdvancedSettings,
  allFields,
}: Pick<GraphSettingsProps, 'advancedSettings' | 'updateAdvancedSettings' | 'allFields'>) {
  function updateSetting<K extends keyof AdvancedSettings>(key: K, value: AdvancedSettings[K]) {
    updateAdvancedSettings({ ...advancedSettings, [key]: value });
  }

  function getNumberUpdater<K extends NumberKeys<AdvancedSettings>>(key: K) {
    return function(e: { target: { valueAsNumber: number } }) {
      updateSetting(key, e.target.valueAsNumber);
    };
  }

  return (
    <EuiForm>
      <EuiFormRow
        helpText={i18n.translate('xpack.graph.settings.advancedSettings.sampleSizeInputHelpText', {
          defaultMessage:
            'Terms are identified from samples of the most relevant documents. Bigger is not necessarily better - can be slower and less relevant.',
        })}
        label={i18n.translate('xpack.graph.settings.advancedSettings.sampleSizeInputLabel', {
          defaultMessage: 'Sample size',
        })}
      >
        <EuiFieldNumber
          min={1}
          max={500000}
          value={advancedSettings.sampleSize}
          onChange={getNumberUpdater('sampleSize')}
        />
      </EuiFormRow>

      <EuiFormRow
        helpText={i18n.translate(
          'xpack.graph.settings.advancedSettings.significantLinksCheckboxHelpText',
          {
            defaultMessage:
              'Identify terms that are &quot;significant&quot; rather than simply popular',
          }
        )}
        label=""
      >
        <EuiCheckbox
          label={i18n.translate(
            'xpack.graph.settings.advancedSettings.significantLinksCheckboxLabel',
            { defaultMessage: 'Significant links' }
          )}
          id="graphSignificance"
          checked={advancedSettings.useSignificance}
          onChange={({ target: { checked } }) => updateSetting('useSignificance', checked)}
        />
      </EuiFormRow>

      <EuiFormRow
        helpText={i18n.translate('xpack.graph.settings.advancedSettings.certaintyInputHelpText', {
          defaultMessage:
            'The min number of documents that are required as evidence before introducing a related term',
        })}
        label={i18n.translate('xpack.graph.settings.advancedSettings.certaintyInputLabel', {
          defaultMessage: 'Certainty',
        })}
      >
        <EuiFieldNumber
          min={1}
          max={500000}
          value={advancedSettings.minDocCount}
          onChange={getNumberUpdater('minDocCount')}
        />
      </EuiFormRow>

      <EuiFormRow
        helpText={i18n.translate(
          'xpack.graph.settings.advancedSettings.diversityFieldInputHelpText1',
          {
            defaultMessage:
              'To avoid document samples being dominated by a single voice, pick the field that helps identify the source of bias. This must be a single-term field or searches will be rejected with an error.',
          }
        )}
        label={i18n.translate('xpack.graph.settings.advancedSettings.diversityFieldInputLabel', {
          defaultMessage: 'Diversity field',
        })}
      >
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.graph.settings.advancedSettings.diversityFieldInputOptionLabel',
            { defaultMessage: '[No diversification]' }
          )}
          singleSelection={{ asPlainText: true }}
          options={allFields.map(field => ({ label: field.name, value: field }))}
          selectedOptions={
            advancedSettings.sampleDiversityField
              ? [
                  {
                    label: advancedSettings.sampleDiversityField.name,
                    value: advancedSettings.sampleDiversityField,
                  },
                ]
              : []
          }
          onChange={choices => {
            updateSetting(
              'sampleDiversityField',
              choices.length === 1 ? choices[0].value : undefined
            );
          }}
        />
      </EuiFormRow>

      {advancedSettings.sampleDiversityField && (
        <EuiFormRow
          helpText={i18n.translate('xpack.graph.settings.advancedSettings.maxValuesInputHelpText', {
            defaultMessage:
              'Max number of documents in a sample that can contain the same value for the {fieldName} field',
            values: {
              fieldName: 'field',
            },
          })}
          label={i18n.translate('xpack.graph.settings.advancedSettings.maxValuesInputLabel', {
            defaultMessage: 'Max docs per field',
          })}
        >
          <EuiFieldNumber
            min={1}
            max={500000}
            value={advancedSettings.maxValuesPerDoc}
            onChange={getNumberUpdater('maxValuesPerDoc')}
          />
        </EuiFormRow>
      )}

      <EuiFormRow
        helpText={i18n.translate('xpack.graph.settings.advancedSettings.timeoutInputHelpText', {
          defaultMessage: 'Max time in milliseconds a request can run',
        })}
        label={i18n.translate('xpack.graph.settings.advancedSettings.timeoutInputLabel', {
          defaultMessage: 'Timeout (ms)',
        })}
      >
        <EuiFieldNumber
          min={1}
          max={500000}
          value={advancedSettings.timeoutMillis}
          onChange={getNumberUpdater('timeoutMillis')}
        />
      </EuiFormRow>
    </EuiForm>
  );
}
