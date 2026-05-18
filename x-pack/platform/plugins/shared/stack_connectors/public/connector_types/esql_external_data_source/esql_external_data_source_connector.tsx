/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Field, SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';

import {
  ALL_ESQL_EXTERNAL_DATA_SOURCE_KINDS,
  getEsqlExternalDataSourceKindLabel,
  isEsqlExternalDataSourceKind,
} from './data_source_kind';
import { EsqlExternalDataSourceTypeFields } from './esql_external_data_source_type_fields';

const EsqlExternalDataSourceConnectorFields: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const [{ config }] = useFormData({ watch: ['config.dataSourceType'] });
  const rawType = config?.dataSourceType;
  const dataSourceType = isEsqlExternalDataSourceKind(String(rawType)) ? rawType : 's3';

  const sourceOptions = ALL_ESQL_EXTERNAL_DATA_SOURCE_KINDS.map((value) => ({
    value,
    text: getEsqlExternalDataSourceKindLabel(value),
  }));

  return (
    <>
      <UseField
        path="config.dataSourceType"
        component={SelectField}
        config={{
          label: i18n.translate(
            'xpack.stackConnectors.esqlExternalDataSource.fields.dataSourceType',
            {
              defaultMessage: 'Data source type',
            }
          ),
          defaultValue: 's3',
        }}
        componentProps={{
          euiFieldProps: {
            options: sourceOptions,
            fullWidth: true,
            readOnly,
            'data-test-subj': 'esqlExtDsDataSourceType',
          },
        }}
      />
      <EuiSpacer size="m" />

      <UseField
        path="config.description"
        component={Field}
        config={{
          label: i18n.translate('xpack.stackConnectors.esqlExternalDataSource.fields.description', {
            defaultMessage: 'Description',
          }),
          defaultValue: '',
        }}
        componentProps={{
          euiFieldProps: {
            readOnly,
            fullWidth: true,
            autoComplete: 'off',
            'data-test-subj': 'esqlExtDsDescription',
          },
        }}
      />
      <EuiSpacer size="m" />

      <EuiText size="s" color="subdued" data-test-subj="esqlExtDsTypeSettingsHelp">
        {i18n.translate('xpack.stackConnectors.esqlExternalDataSource.typeSettingsHelp', {
          defaultMessage: 'Connection settings for the selected data source type.',
        })}
      </EuiText>
      <EuiSpacer size="s" />

      <EsqlExternalDataSourceTypeFields kind={dataSourceType} readOnly={readOnly} />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default EsqlExternalDataSourceConnectorFields;
