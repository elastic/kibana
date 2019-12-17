/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiFormRow, EuiDualRange, EuiCallOut, EuiLink } from '@elastic/eui';

import {
  UseField,
  Field,
  FormDataProvider,
  FieldHook,
  UseMultiFields,
} from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { EditFieldFormRow } from '../fields/edit_field';
import { documentationService } from '../../../../../services/documentation';

export const FieldDataParameter = () => {
  const onFrequencyFilterChange = (minField: FieldHook, maxField: FieldHook) => ([
    min,
    max,
  ]: any) => {
    minField.setValue(min);
    maxField.setValue(max);
  };

  return (
    <EditFieldFormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.fielddata.fielddataFormRowTitle', {
        defaultMessage: 'Fielddata',
      })}
      description={i18n.translate(
        'xpack.idxMgmt.mappingsEditor.fielddata.fielddataFormRowDescription',
        {
          defaultMessage:
            'Whether to use in-memory fielddata for sorting, aggregations, or scripting.',
        }
      )}
      docLink={{
        text: i18n.translate('xpack.idxMgmt.mappingsEditor.fielddata.fieldDataDocLinkText', {
          defaultMessage: 'Fielddata documentation',
        }),
        href: documentationService.getFielddataLink(),
      }}
      formFieldPath="fielddata"
    >
      {/* fielddata_frequency_filter */}
      <EuiFormRow
        label={i18n.translate('xpack.idxMgmt.mappingsEditor.fielddata.frequencyFilterFieldLabel', {
          defaultMessage: 'Min/max frequency percentage',
        })}
        fullWidth
      >
        <UseMultiFields
          fields={{
            min: {
              path: 'fielddata_frequency_filter.min',
              config: getFieldConfig('fielddata_frequency_filter', 'min'),
            },
            max: {
              path: 'fielddata_frequency_filter.max',
              config: getFieldConfig('fielddata_frequency_filter', 'max'),
            },
          }}
        >
          {({ min, max }) => {
            return (
              <EuiDualRange
                min={0}
                max={100}
                value={[min.value as number, max.value as number]}
                onChange={onFrequencyFilterChange(min, max)}
                showInput
                fullWidth
              />
            );
          }}
        </UseMultiFields>
      </EuiFormRow>

      <EuiSpacer />

      <UseField
        path="fielddata_frequency_filter.min_segment_size"
        config={getFieldConfig('fielddata_frequency_filter', 'min_segment_size')}
        component={Field}
      />

      <FormDataProvider pathsToWatch="fielddata">
        {({ fielddata }) =>
          fielddata === true ? (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut color="warning">
                <p>
                  <FormattedMessage
                    id="xpack.idxMgmt.mappingsEditor.fielddata.fielddataEnabledWarningMessage"
                    defaultMessage="Fielddata can consume significant memory, especially when loading high-cardinality text fields. {docsLink}"
                    values={{
                      docsLink: (
                        <EuiLink
                          href={documentationService.getEnablingFielddataLink()}
                          target="_blank"
                        >
                          {i18n.translate(
                            'xpack.idxMgmt.mappingsEditor.fielddata.fielddataEnabledDocumentationLink',
                            {
                              defaultMessage: 'Learn more.',
                            }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiCallOut>
            </>
          ) : null
        }
      </FormDataProvider>
    </EditFieldFormRow>
  );
};
