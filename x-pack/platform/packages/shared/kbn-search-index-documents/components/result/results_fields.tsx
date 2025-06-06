/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTable, EuiTableBody, EuiTableHeader, EuiTableHeaderCell } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { ResultField } from './result_field';
import { ResultFieldProps } from './result_types';

interface Props {
  documentId: string;
  fields: ResultFieldProps[];
  isExpanded: boolean;
}

export const ResultFields: React.FC<Props> = ({ documentId, fields, isExpanded }) => {
  return (
    <EuiTable
      aria-label={i18n.translate('xpack.searchIndexDocuments.resultFields.tableLabel', {
        defaultMessage: 'Fields for the document with ID {documentId}',
        values: { documentId },
      })}
    >
      <EuiTableHeader>
        <EuiTableHeaderCell width="20%">
          {i18n.translate('xpack.searchIndexDocuments.resultFields.fieldTypeHeaderLabel', {
            defaultMessage: 'Field',
          })}
        </EuiTableHeaderCell>
        <EuiTableHeaderCell>
          {i18n.translate('xpack.searchIndexDocuments.resultFields.contentstableHeaderLabel', {
            defaultMessage: 'Contents',
          })}
        </EuiTableHeaderCell>
      </EuiTableHeader>
      <EuiTableBody>
        {fields.map((field) => (
          <ResultField
            isExpanded={isExpanded}
            iconType={field.iconType}
            fieldName={field.fieldName}
            fieldValue={field.fieldValue}
            fieldType={field.fieldType}
            key={field.fieldName}
          />
        ))}
      </EuiTableBody>
    </EuiTable>
  );
};
