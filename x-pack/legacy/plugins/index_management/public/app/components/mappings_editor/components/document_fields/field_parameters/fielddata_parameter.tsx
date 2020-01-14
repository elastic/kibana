/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiCallOut,
  EuiLink,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { UseField, Field, UseMultiFields, FieldHook } from '../../../shared_imports';
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
      nextMinConfig.deserializer?.(nextMinConfig.defaultValue) ?? nextMinConfig.defaultValue
    );
    max.setValue(
      nextMaxConfig.deserializer?.(nextMaxConfig.defaultValue) ?? nextMaxConfig.defaultValue
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
          const FielddataFrequencyComponent =
            valueType === 'percentage'
              ? FielddataFrequencyFilterPercentage
              : FielddataFrequencyFilterAbsolute;

          return (
            <>
              <EuiCallOut
                color="warning"
                iconType="alert"
                size="s"
                title={
                  <FormattedMessage
                    id="xpack.idxMgmt.mappingsEditor.fielddata.fielddataEnabledWarningTitle"
                    defaultMessage="Fielddata can consume significant memory. This is particularly likely when loading high-cardinality text fields. {docsLink}"
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
                }
              />

              <EuiSpacer size="m" />

              <EuiTitle size="xxs">
                <h4>
                  {i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.fielddata.fielddataDocumentFrequencyRangeTitle',
                    {
                      defaultMessage: 'Document frequency range',
                    }
                  )}
                </h4>
              </EuiTitle>

              <EuiSpacer size="s" />

              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.idxMgmt.mappingsEditor.fielddata.fielddataFrequencyMessage"
                  defaultMessage="This range determines the terms loaded into memory. Frequency is calculated per segment. Exclude small segments based on their size, in number of documents. {docsLink}"
                  values={{
                    docsLink: (
                      <EuiLink
                        href={documentationService.getFielddataFrequencyLink()}
                        target="_blank"
                      >
                        {i18n.translate(
                          'xpack.idxMgmt.mappingsEditor.fielddata.fielddataFrequencyDocumentationLink',
                          {
                            defaultMessage: 'Learn more.',
                          }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>

              <EuiSpacer size="m" />

              <EuiFlexGroup>
                <EuiFlexItem>
                  <FielddataFrequencyComponent min={min} max={max} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <UseField
                    path="fielddata_frequency_filter.min_segment_size"
                    config={getFieldConfig('fielddata_frequency_filter', 'min_segment_size')}
                    component={Field}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="s" />

              <EuiSwitch
                compressed
                label={i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.fielddata.useAbsoluteValuesFieldLabel',
                  {
                    defaultMessage: 'Use absolute values',
                  }
                )}
                checked={valueType === 'absolute'}
                onChange={switchType(min, max)}
                data-test-subj="input"
              />
            </>
          );
        }}
      </UseMultiFields>
    </EditFieldFormRow>
  );
};
