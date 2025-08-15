/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { FindAnonymizationFieldsClientResponse } from './types';

const EMPTY_CONVERSATIONS_ARRAY: string[] = [];

export type UseSelectionReturn = ReturnType<typeof useSelection>;

export const useSelection = ({
  anonymizationAllFields,
  anonymizationPageFields,
}: {
  anonymizationAllFields: FindAnonymizationFieldsClientResponse;
  anonymizationPageFields: FindAnonymizationFieldsClientResponse;
}) => {
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(EMPTY_CONVERSATIONS_ARRAY);
  const [totalSelectedItems, setTotalSelectedItems] = useState(0);
  const totalItemCount = anonymizationAllFields.total;
  const allFieldsOnCurrentPage = useMemo(
    () => anonymizationPageFields.data?.map((field) => field.field) || [],
    [anonymizationPageFields.data]
  );
  const allFields = useMemo(
    () => anonymizationAllFields.data?.map((field) => field.field) || [],
    [anonymizationAllFields.data]
  );

  const handleUnselectAll = useCallback(() => {
    setIsSelectAll(false);
    setSelectedFields([]);
    setTotalSelectedItems(0);
  }, []);

  const handleSelectAll = useCallback(() => {
    setIsSelectAll(true);
    setTotalSelectedItems(totalItemCount);
    setSelectedFields([...allFields]);
  }, [allFields, totalItemCount]);

  const handlePageChecked = useCallback(() => {
    const newlySelectedItems = allFieldsOnCurrentPage.reduce(
      (acc, currentField) => {
        if (!selectedFields.includes(currentField)) {
          acc.push(currentField);
        }
        return acc;
      },
      [...selectedFields]
    );
    setSelectedFields(newlySelectedItems);
    setTotalSelectedItems(
      (prev) => prev + selectedFields.filter((field) => !selectedFields.includes(field)).length
    );
    if (newlySelectedItems.length === totalItemCount) {
      setIsSelectAll(true);
    }
  }, [allFieldsOnCurrentPage, selectedFields, totalItemCount]);

  const handlePageUnchecked = useCallback(() => {
    setSelectedFields(selectedFields.filter((field) => !allFieldsOnCurrentPage.includes(field)));
    setTotalSelectedItems((prev) => (prev || totalItemCount) - allFieldsOnCurrentPage.length);

    setIsSelectAll(false);
  }, [allFieldsOnCurrentPage, selectedFields, totalItemCount]);

  const handleRowChecked = useCallback(
    (selectedField: string) => {
      const newlySelectedItems = selectedFields.includes(selectedField)
        ? selectedFields
        : [...selectedFields, selectedField];
      setSelectedFields(newlySelectedItems);
      if (newlySelectedItems.length === totalItemCount) {
        setIsSelectAll(true);
      }
      setTotalSelectedItems(newlySelectedItems.length);
    },
    [selectedFields, totalItemCount]
  );

  const handleRowUnChecked = useCallback(
    (selectedField: string) => {
      setSelectedFields((prev) => {
        return prev.filter((item) => item !== selectedField);
      });
      setIsSelectAll(false);
      setTotalSelectedItems((prev) => (prev || totalItemCount) - 1);
    },
    [totalItemCount]
  );

  return {
    selectionState: {
      isSelectAll,
      selectedFields,
      totalSelectedItems,
    },
    selectionActions: {
      handleUnselectAll,
      handleSelectAll,
      handlePageUnchecked,
      handlePageChecked,
      handleRowUnChecked,
      handleRowChecked,
      setSelectedFields,
      setIsSelectAll,
      setTotalSelectedItems,
    },
  };
};
