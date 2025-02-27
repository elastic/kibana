/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { difference, isEqual } from 'lodash';
import type { CaseUpdateRequest } from '../../../common/ui';
import { useUpdateCases } from '../../containers/use_bulk_update_case';
import type { CasesUI, CaseUI } from '../../../common';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { UseActionProps, ItemsSelectionState } from './types';

type UseItemsActionProps<T> = UseActionProps & {
  fieldKey: 'tags' | 'assignees';
  successToasterTitle: (totalCases: number) => string;
  fieldSelector: (theCase: CaseUI) => string[];
  itemsTransformer: (items: string[]) => T;
};

export const useItemsAction = <T,>({
  isDisabled,
  fieldKey,
  onAction,
  onActionSuccess,
  successToasterTitle,
  fieldSelector,
  itemsTransformer,
}: UseItemsActionProps<T>) => {
  const { mutate: updateCases } = useUpdateCases();
  const { permissions } = useCasesContext();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [selectedCasesToEdit, setSelectedCasesToEdit] = useState<CasesUI>([]);
  const canUpdateStatus = permissions.update;
  const canUpdateAssignee = permissions.assign;
  const isActionDisabled = isDisabled || (!canUpdateStatus && !canUpdateAssignee);

  const onFlyoutClosed = useCallback(() => setIsFlyoutOpen(false), []);
  const openFlyout = useCallback(
    (selectedCases: CasesUI) => {
      onAction();
      setIsFlyoutOpen(true);
      setSelectedCasesToEdit(selectedCases);
    },
    [onAction]
  );

  const areItemsEqual = (originalItems: Set<string>, itemsToUpdate: Set<string>): boolean => {
    return isEqual(originalItems, itemsToUpdate);
  };

  const onSaveItems = useCallback(
    (itemsSelection: ItemsSelectionState) => {
      onAction();
      onFlyoutClosed();

      const casesToUpdate = selectedCasesToEdit.reduce((acc, theCase) => {
        const caseFieldValue = fieldSelector(theCase);

        const itemsWithoutUnselectedItems = difference(
          caseFieldValue,
          itemsSelection.unSelectedItems
        );

        const uniqueItems = new Set([
          ...itemsWithoutUnselectedItems,
          ...itemsSelection.selectedItems,
        ]);

        if (areItemsEqual(new Set([...caseFieldValue]), uniqueItems)) {
          return acc;
        }

        return [
          ...acc,
          {
            [fieldKey]: itemsTransformer(Array.from(uniqueItems.values())),
            id: theCase.id,
            version: theCase.version,
          },
        ];
      }, [] as CaseUpdateRequest[]);

      updateCases(
        {
          cases: casesToUpdate,
          successToasterTitle: successToasterTitle(selectedCasesToEdit.length),
        },
        { onSuccess: onActionSuccess }
      );
    },
    [
      fieldKey,
      fieldSelector,
      itemsTransformer,
      onAction,
      onActionSuccess,
      onFlyoutClosed,
      selectedCasesToEdit,
      successToasterTitle,
      updateCases,
    ]
  );

  return { isFlyoutOpen, onFlyoutClosed, onSaveItems, openFlyout, isActionDisabled };
};

export type UseItemsAction = ReturnType<typeof useItemsAction>;
