/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiFormRow, EuiCallOut, EuiLink, EuiSwitch } from '@elastic/eui';

import {
  UseField,
  Field,
  FormDataProvider,
  UseMultiFields,
  FieldHook,
} from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { NormalizedField } from '../../../types';
import { EditFieldFormRow } from '../fields/edit_field';
import { documentationService } from '../../../../../services/documentation';
import { FielddataFrequencyFilterPercentage } from './fielddata_frequency_filter_percentage';
import { FielddataFrequencyFilterAbsolute } from './fielddata_frequency_filter_absolute';

interface Props {
  defaultToggleValue: boolean;
  field: NormalizedField;
}

type ValueType = 'percentage' | 'absolute';

export const FieldDataParameter = ({ field, defaultToggleValue }: Props) => {
  const [valueType, setValueType] = useState<ValueType>(
    field.source.fielddata_frequency_filter !== undefined
      ? (field.source.fielddata_frequency_filter as any).max > 1
        ? 'absolute'
        : 'percentage'
      : 'percentage'
  );

  const getConfig = (fieldProp: 'min' | 'max', type = valueType) =>
    type === 'percentage'
      ? getFieldConfig('fielddata_frequency_filter_percentage', fieldProp)
      : getFieldConfig('fielddata_frequency_filter_absolute', fieldProp);

  const switchType = (min: FieldHook, max: FieldHook) => () => {
    const nextValueType = valueType === 'percentage' ? 'absolute' : 'percentage';
    const nextMinConfig = getConfig('min', nextValueType);
    const nextMaxConfig = getConfig('max', nextValueType);

    min.setValue(
      nextMinConfig.deserializer
        ? nextMinConfig.deserializer(nextMinConfig.defaultValue)
        : nextMinConfig.defaultValue
    );
    max.setValue(
      nextMaxConfig.deserializer
        ? nextMaxConfig.deserializer(nextMaxConfig.defaultValue)
        : nextMaxConfig.defaultValue
    );

    setValueType(nextValueType);
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
      defaultToggleValue={defaultToggleValue}
    >
      {/* fielddata_frequency_filter */}
      <UseMultiFields
        fields={{
          min: {
            path: 'fielddata_frequency_filter.min',
            config: getConfig('min'),
          },
          max: {
            path: 'fielddata_frequency_filter.max',
            config: getConfig('max'),
          },
        }}
      >
        {({ min, max }) => {
          return (
            <>
              {valueType === 'percentage' ? (
                <FielddataFrequencyFilterPercentage min={min} max={max} />
              ) : (
                <FielddataFrequencyFilterAbsolute min={min} max={max} />
              )}

              <EuiSpacer size="s" />

              <EuiSwitch
                label={
                  valueType === 'percentage'
                    ? i18n.translate(
                        'xpack.idxMgmt.mappingsEditor.fielddata.useAbsoluteValuesFieldLabel',
                        {
                          defaultMessage: 'Use absolute values',
                        }
                      )
                    : i18n.translate(
                        'xpack.idxMgmt.mappingsEditor.fielddata.usePercentageValuesFieldLabel',
                        {
                          defaultMessage: 'Use percentage values',
                        }
                      )
                }
                checked={valueType === 'percentage'}
                onChange={switchType(min, max)}
                data-test-subj="input"
              />
            </>
          );
        }}
      </UseMultiFields>

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
              <EuiSpacer />
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
