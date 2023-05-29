/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { EuiInMemoryTable, EuiSelect, EuiSelectOption } from '@elastic/eui';
import { getIncompatibleDocsTableColumns, getIncompatibleDocsTableRows } from '../helpers';
import { AllowedValue, OnInValidValueUpdateCallback, UnallowedValueDoc } from '../../types';
import { useUpdateUnallowedValues } from '../../use_update_unallowed_values';

const IndexInvalidDocsComponent: React.FC<{
  indexInvalidDocs: UnallowedValueDoc[];
  indexFieldName: string;
  allowedValues: AllowedValue[] | undefined;
  onInValidValueUpdateCallback?: OnInValidValueUpdateCallback;
}> = ({ indexInvalidDocs, indexFieldName, allowedValues, onInValidValueUpdateCallback }) => {
  const indexInvalidValues = getIncompatibleDocsTableRows({
    indexInvalidDocs,
    indexFieldName,
    allowedValues,
  });
  const columns = getIncompatibleDocsTableColumns(onInValidValueUpdateCallback);
  return <EuiInMemoryTable items={indexInvalidValues} columns={columns} />;
};

IndexInvalidDocsComponent.displayName = 'IndexInvalidDocsComponent';
export const IndexInvalidDocs = React.memo(IndexInvalidDocsComponent);

const IndexInvalidValueDropdownComponent: React.FC<{
  allowedValues: AllowedValue[] | undefined;
  id: string;
  indexFieldName: string;
  indexInvalidValue: string;
  indexName: string;
  onInValidValueUpdateCallback?: OnInValidValueUpdateCallback;
}> = ({
  indexFieldName,
  allowedValues,
  id,
  indexName,
  indexInvalidValue,
  onInValidValueUpdateCallback,
}) => {
  const [value, setValue] = useState(indexInvalidValue);
  // const [requestItems, setRequestItems] = useState<
  //   Array<{
  //     id: string;
  //     indexFieldName: string;
  //     indexName: string;
  //     value: string;
  //   }>
  // >([]);
  const { error, result, loading, updateUnallowedValue } = useUpdateUnallowedValues();
  const onChange = async (e) => {
    const refetchAbortController = new AbortController();

    setValue(e.target.value);
    if (e.target.value !== indexInvalidValue) {
      // setRequestItems([
      //   {
      //     id,
      //     indexFieldName,
      //     indexName,
      //     value: e.target.value,
      //   },
      // ]);
      await updateUnallowedValue({
        abortController: refetchAbortController,
        requestItems: [
          {
            id,
            indexFieldName,
            indexName,
            value: e.target.value,
          },
        ],
      });
      await onInValidValueUpdateCallback?.();
    }
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
      disabled={loading}
    />
  );
};

IndexInvalidValueDropdownComponent.displayName = 'IndexInvalidValueDropdownComponent';
export const IndexInvalidValueDropdown = React.memo(IndexInvalidValueDropdownComponent);
