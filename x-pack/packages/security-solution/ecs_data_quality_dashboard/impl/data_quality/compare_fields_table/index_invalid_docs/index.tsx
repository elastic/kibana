/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { EuiInMemoryTable, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { getIncompatibleDocsTableColumns, getIncompatibleDocsTableRows } from '../helpers';
import { AllowedValue, UnallowedValueDoc } from '../../types';

const IndexInvalidDocsComponent: React.FC<{
  indexInvalidDocs: UnallowedValueDoc[];
  indexFieldName: string;
  allowedValues: AllowedValue[] | undefined;
}> = ({ indexInvalidDocs, indexFieldName, allowedValues }) => {
  const indexInvalidValues = getIncompatibleDocsTableRows({
    indexInvalidDocs,
    indexFieldName,
    allowedValues,
  });
  const columns = getIncompatibleDocsTableColumns();
  return <EuiInMemoryTable items={indexInvalidValues} columns={columns} />;
};

IndexInvalidDocsComponent.displayName = 'IndexInvalidDocsComponent';
export const IndexInvalidDocs = React.memo(IndexInvalidDocsComponent);

const IndexInvalidValueDropdownComponent: React.FC<{
  allowedValues: AllowedValue[] | undefined;
  indexFieldName: string;
  indexInvalidValue: string;
}> = ({ indexFieldName, allowedValues, indexInvalidValue }) => {
  const [value, setValue] = useState(indexInvalidValue);
  const onChange = (e) => {
    setValue(e.target.name);
  };
  const options = useMemo(
    () =>
      [{ value: indexInvalidValue, text: indexInvalidValue }].concat(
        allowedValues?.reduce((acc, { name }) => {
          if (name != null) {
            acc.push({ text: name, value: name });
          }
          return acc;
        }, [] as EuiSelectOption[])
      ),
    [allowedValues, indexInvalidValue]
  );
  return (
    <EuiSelect
      id={`invalid-value-${indexFieldName}-options`}
      options={options}
      value={value}
      onChange={(e) => onChange(e)}
    />
  );
};

IndexInvalidValueDropdownComponent.displayName = 'IndexInvalidValueDropdownComponent';
export const IndexInvalidValueDropdown = React.memo(IndexInvalidValueDropdownComponent);
