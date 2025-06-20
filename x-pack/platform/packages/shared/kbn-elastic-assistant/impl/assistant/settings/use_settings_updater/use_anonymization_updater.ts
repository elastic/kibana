/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FindAnonymizationFieldsResponse,
  PerformAnonymizationFieldsBulkActionRequestBody,
} from '@kbn/elastic-assistant-common/impl/schemas';
import { useCallback, useEffect, useState } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { BatchUpdateListItem } from '../../../data_anonymization_editor/context_editor/types';
import { bulkUpdateAnonymizationFields } from '../../api/anonymization_fields/bulk_update_anonymization_fields';

const DEFAULT_ANONYMIZATION_FIELDS = {
  page: 0,
  perPage: 0,
  total: 0,
  data: [],
};

interface Params {
  anonymizationFields: FindAnonymizationFieldsResponse;
  http: HttpSetup;
  toasts?: IToasts;
}

interface AnonymizationUpdater {
  hasPendingChanges: boolean;
  onListUpdated: (updates: BatchUpdateListItem[]) => Promise<void>;
  resetAnonymizationSettings: () => void;
  saveAnonymizationSettings: () => Promise<boolean>;
  updatedAnonymizationData: FindAnonymizationFieldsResponse;
}

export const useAnonymizationUpdater = ({
  anonymizationFields = DEFAULT_ANONYMIZATION_FIELDS,
  http,
  toasts,
}: Params): AnonymizationUpdater => {
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [anonymizationFieldsBulkActions, setAnonymizationFieldsBulkActions] =
    useState<PerformAnonymizationFieldsBulkActionRequestBody>({});
  const [updatedAnonymizationData, setUpdatedAnonymizationData] =
    useState<FindAnonymizationFieldsResponse>(anonymizationFields);

  useEffect(() => {
    if (
      !(
        anonymizationFieldsBulkActions.create?.length ||
        anonymizationFieldsBulkActions.update?.length ||
        anonymizationFieldsBulkActions.delete?.ids?.length
      )
    ) {
      setUpdatedAnonymizationData(anonymizationFields);
    }
  }, [
    anonymizationFields,
    anonymizationFieldsBulkActions.create?.length,
    anonymizationFieldsBulkActions.delete?.ids?.length,
    anonymizationFieldsBulkActions.update?.length,
  ]);
  const resetAnonymizationSettings = useCallback(() => {
    setHasPendingChanges(false);
    setUpdatedAnonymizationData(anonymizationFields);
  }, [anonymizationFields]);

  const saveAnonymizationSettings = useCallback(async (): Promise<boolean> => {
    const hasBulkAnonymizationFields =
      anonymizationFieldsBulkActions.create ||
      anonymizationFieldsBulkActions.update ||
      anonymizationFieldsBulkActions.delete;

    const bulkAnonymizationFieldsResult = hasBulkAnonymizationFields
      ? await bulkUpdateAnonymizationFields(http, anonymizationFieldsBulkActions, toasts)
      : undefined;

    setHasPendingChanges(false);
    return bulkAnonymizationFieldsResult?.success ?? false;
  }, [anonymizationFieldsBulkActions, http, toasts]);

  const onListUpdated = useCallback(
    async (updates: BatchUpdateListItem[]) => {
      const updatedFieldsKeys = updates.map((u) => u.field);
      const updatedFields = updates.map((u) => ({
        ...(updatedAnonymizationData.data.find((f) => f.field === u.field) ?? {
          id: '',
          field: '',
        }),
        ...(u.update === 'allow' || u.update === 'defaultAllow'
          ? { allowed: u.operation === 'add' }
          : {}),
        ...(u.update === 'allowReplacement' || u.update === 'defaultAllowReplacement'
          ? { anonymized: u.operation === 'add' }
          : {}),
      }));
      setHasPendingChanges(true);
      setAnonymizationFieldsBulkActions({
        ...anonymizationFieldsBulkActions,
        // Only update makes sense now, as long as we don't have an add new field design/UX
        update: [...(anonymizationFieldsBulkActions?.update ?? []), ...updatedFields],
      });
      setUpdatedAnonymizationData({
        ...updatedAnonymizationData,
        data: [
          ...updatedAnonymizationData.data.filter((f) => !updatedFieldsKeys.includes(f.field)),
          ...updatedFields,
        ],
      });
    },
    [updatedAnonymizationData, anonymizationFieldsBulkActions]
  );

  return {
    hasPendingChanges,
    onListUpdated,
    resetAnonymizationSettings,
    saveAnonymizationSettings,
    updatedAnonymizationData,
  };
};
