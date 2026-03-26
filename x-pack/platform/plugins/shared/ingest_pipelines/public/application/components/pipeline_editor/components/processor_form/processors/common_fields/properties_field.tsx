/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import type { EuiComboBoxProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ComboBoxField, FIELD_TYPES, UseField } from '../../../../../../../shared_imports';

import type { FieldsConfig } from '../shared';
import { to } from '../shared';

const fieldsConfig: FieldsConfig = {
  properties: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    serializer: (v: string[]) => (v.length ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.commonFields.propertiesFieldLabel',
      {
        defaultMessage: 'Properties (optional)',
      }
    ),
  },
};

interface Props {
  helpText?: React.ReactNode;
  euiFieldProps?: EuiComboBoxProps<string>;
}

export const PropertiesField: FunctionComponent<Props> = ({ helpText, euiFieldProps }) => {
  return (
    <UseField
      config={{
        ...fieldsConfig.properties,
        helpText,
      }}
      component={ComboBoxField}
      path="fields.properties"
      componentProps={{ euiFieldProps }}
    />
  );
};
