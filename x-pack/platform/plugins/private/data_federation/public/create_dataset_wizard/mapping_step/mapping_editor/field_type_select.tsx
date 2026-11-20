/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { EuiFormRow, EuiLink, EuiSelect } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DatasetMappingFieldType } from '../../../../common/dataset_types';
import type { DataFederationKibanaServices } from '../../../types';
import { getTypeDocsByValue, TYPE_LABEL_BY_VALUE } from './constants';
import { fieldTypeSelectStrings } from './field_type_select_i18n';

const typeOptions = Object.entries(TYPE_LABEL_BY_VALUE).map(([typeValue, text]) => ({
  value: typeValue,
  text,
}));

export const getFieldTypeDocsHelpText = (
  type: DatasetMappingFieldType,
  docsByValue: Record<DatasetMappingFieldType, string>
): React.ReactNode => {
  const docs = docsByValue[type];
  if (!docs) return;

  return (
    <EuiLink href={docs} target="_blank" external>
      {fieldTypeSelectStrings.fieldTypeDocsLink(TYPE_LABEL_BY_VALUE[type])}
    </EuiLink>
  );
};

export interface FieldTypeSelectProps {
  value: '' | string;
  onChange: (type: DatasetMappingFieldType) => void;
}

export const FieldTypeSelect = ({ value, onChange }: FieldTypeSelectProps) => {
  const {
    services: { docLinks },
  } = useKibana<DataFederationKibanaServices>();
  const typeDocsByValue = useMemo(() => getTypeDocsByValue(docLinks), [docLinks]);

  const helpText: ReactNode = useMemo(() => {
    const type = value as DatasetMappingFieldType;
    if (!type) return undefined;
    return getFieldTypeDocsHelpText(type, typeDocsByValue);
  }, [value, typeDocsByValue]);

  return (
    <EuiFormRow label={fieldTypeSelectStrings.typeLabel} helpText={helpText} fullWidth>
      <EuiSelect
        fullWidth
        options={typeOptions}
        value={value}
        onChange={(e) => onChange(e.target.value as DatasetMappingFieldType)}
        data-test-subj="dataFederationMappingEditorFieldType"
      />
    </EuiFormRow>
  );
};
