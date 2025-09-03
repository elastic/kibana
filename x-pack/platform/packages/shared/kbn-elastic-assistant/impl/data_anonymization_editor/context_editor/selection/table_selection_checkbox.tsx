/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { EuiCheckbox } from '@elastic/eui';
import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common';
import {
  HandlePageChecked,
  HandlePageUnchecked,
  HandleRowChecked,
  HandleRowUnChecked,
} from './types';
import { ContextEditorRow } from '../types';

export const PageSelectionCheckbox = ({
  anonymizationPageFields = [],
  selectedFields = [],
  handlePageChecked,
  handlePageUnchecked,
  totalItemCount,
  handlePageReset,
}: {
  anonymizationPageFields?: FindAnonymizationFieldsResponse['data'];
  selectedFields?: string[];
  handlePageChecked: HandlePageChecked;
  handlePageUnchecked: HandlePageUnchecked;
  totalItemCount: number;
  handlePageReset: (fields: string[]) => void;
}) => {
  const allFieldsOnCurrentPage = useMemo(
    () => anonymizationPageFields.map((row) => row.field),
    [anonymizationPageFields]
  );
  const [pageSelectionChecked, setPageSelectionChecked] = useState(
    selectedFields.length > 0 &&
      allFieldsOnCurrentPage.every((field) => selectedFields.includes(field))
  );

  useEffect(() => {
    setPageSelectionChecked(
      selectedFields.length > 0 &&
        allFieldsOnCurrentPage.every((field) => selectedFields.includes(field))
    );
  }, [selectedFields, allFieldsOnCurrentPage]);

  if (totalItemCount === 0 || allFieldsOnCurrentPage.length === 0) {
    return null;
  }

  return (
    <EuiCheckbox
      data-test-subj={`checkboxSelectAll`}
      id={`checkboxSelectAll`}
      checked={pageSelectionChecked}
      onChange={(e) => {
        if (e.target.checked) {
          setPageSelectionChecked(true);
          handlePageChecked();
        } else {
          setPageSelectionChecked(false);
          handlePageUnchecked();
          handlePageReset(allFieldsOnCurrentPage);
        }
      }}
    />
  );
};

export const InputCheckbox = ({
  row,
  selectedFields = [],
  handleRowChecked,
  handleRowUnChecked,
  handleRowReset,
}: {
  row: ContextEditorRow;
  selectedFields?: string[];
  handleRowChecked: HandleRowChecked;
  handleRowUnChecked: HandleRowUnChecked;
  handleRowReset: (field: string) => void;
}) => {
  const [checked, setChecked] = useState(selectedFields.includes(row.field));

  useEffect(() => {
    setChecked(selectedFields.includes(row.field));
  }, [selectedFields, row.field]);

  return (
    <EuiCheckbox
      data-test-subj={`field-${row.field}`}
      id={`field-${row.field}`}
      checked={checked}
      onChange={(e) => {
        if (e.target.checked) {
          setChecked(true);
          handleRowChecked(row.field);
        } else {
          setChecked(false);
          handleRowUnChecked(row.field);
          handleRowReset(row.field);
        }
      }}
    />
  );
};
