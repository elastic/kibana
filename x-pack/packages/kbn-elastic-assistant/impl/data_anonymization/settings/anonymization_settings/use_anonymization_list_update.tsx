/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { PerformAnonymizationFieldsBulkActionRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

import { BatchUpdateListItem } from '../../../data_anonymization_editor/context_editor/types';

export interface UseAnonymizationListUpdateProps {
  anonymizationFields: FindAnonymizationFieldsResponse;
  anonymizationFieldsBulkActions: PerformAnonymizationFieldsBulkActionRequestBody;
  setAnonymizationFieldsBulkActions: React.Dispatch<
    React.SetStateAction<PerformAnonymizationFieldsBulkActionRequestBody>
  >;
  setUpdatedAnonymizationData: React.Dispatch<
    React.SetStateAction<FindAnonymizationFieldsResponse>
  >;
}

export const useAnonymizationListUpdate = ({
  anonymizationFields,
  anonymizationFieldsBulkActions,
  setAnonymizationFieldsBulkActions,
  setUpdatedAnonymizationData,
}: UseAnonymizationListUpdateProps) => {
  const onListUpdated = useCallback(
    async (updates: BatchUpdateListItem[]) => {
      const updatedFieldsKeys = updates.map((u) => u.field);
      const updatedFields = updates.map((u) => ({
        ...(anonymizationFields.data.find((f) => f.field === u.field) ?? { id: '', field: '' }),
        ...(u.update === 'allow' || u.update === 'defaultAllow'
          ? { allowed: u.operation === 'add' }
          : {}),
        ...(u.update === 'allowReplacement' || u.update === 'defaultAllowReplacement'
          ? { anonymized: u.operation === 'add' }
          : {}),
      }));
      setAnonymizationFieldsBulkActions({
        ...anonymizationFieldsBulkActions,
        // Only update makes sense now, as long as we don't have an add new field design/UX
        update: [...(anonymizationFieldsBulkActions?.update ?? []), ...updatedFields],
      });
      setUpdatedAnonymizationData({
        ...anonymizationFields,
        data: [
          ...anonymizationFields.data.filter((f) => !updatedFieldsKeys.includes(f.field)),
          ...updatedFields,
        ],
      });
    },
    [
      anonymizationFields,
      anonymizationFieldsBulkActions,
      setAnonymizationFieldsBulkActions,
      setUpdatedAnonymizationData,
    ]
  );

  return onListUpdated;
};
