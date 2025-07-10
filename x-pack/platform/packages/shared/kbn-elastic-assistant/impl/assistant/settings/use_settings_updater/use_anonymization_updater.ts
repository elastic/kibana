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
  anonymizationAllFields?: FindAnonymizationFieldsResponse;
  http: HttpSetup;
  toasts?: IToasts;
}

export type OnListUpdated = (
  updates: BatchUpdateListItem[],
  isSelectAll?: boolean,
  anonymizationAllFields?: FindAnonymizationFieldsResponse
) => void;

export type HandleRowReset = (field: string) => void;
export type HandlePageReset = (fields: string[]) => void;

interface AnonymizationUpdater {
  hasPendingChanges: boolean;
  onListUpdated: OnListUpdated;
  resetAnonymizationSettings: () => void;
  saveAnonymizationSettings: () => Promise<boolean>;
  updatedAnonymizationData: FindAnonymizationFieldsResponse;
  handleRowReset: HandleRowReset;
  handlePageReset: HandlePageReset;
}

export const useAnonymizationUpdater = ({
  anonymizationAllFields,
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
    setUpdatedAnonymizationData(() => {
      if (
        !(
          anonymizationFieldsBulkActions.create?.length ||
          anonymizationFieldsBulkActions.update?.length ||
          anonymizationFieldsBulkActions.delete?.ids?.length
        )
      ) {
        // Update the page data when no pending changes
        return anonymizationFields;
      } else {
        // If there are pending changes, merge the bulk actions status with the existing data
        return {
          ...anonymizationFields,
          data: (anonymizationFields.data ?? []).map((f) => {
            const bulkActionField = anonymizationFieldsBulkActions.update?.find(
              (pf) => pf.id === f.id
            );
            return {
              ...f,
              allowed: bulkActionField?.allowed ?? f.allowed,
              anonymized: bulkActionField?.anonymized ?? f.anonymized,
            };
          }),
        };
      }
    });
  }, [
    anonymizationFields,
    anonymizationFieldsBulkActions.create?.length,
    anonymizationFieldsBulkActions.delete?.ids?.length,
    anonymizationFieldsBulkActions.update,
  ]);

  const resetAnonymizationSettings = useCallback(() => {
    setAnonymizationFieldsBulkActions((prev) => ({
      ...prev,
      update: [],
    }));
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
    if (!bulkAnonymizationFieldsResult?.success) {
      setUpdatedAnonymizationData(anonymizationFields);
    }
    return bulkAnonymizationFieldsResult?.success ?? false;
  }, [anonymizationFields, anonymizationFieldsBulkActions, http, toasts]);

  const onListUpdated: OnListUpdated = useCallback(
    (updates) => {
      // when isSelectAll is true, we use anonymizationAllFields to find the field
      // otherwise, we use `updates` to find the field
      const batchUpdatedFields = updates;
      const updatedFieldsKeys = batchUpdatedFields.map((u) => u.field);
      const updatedFields = batchUpdatedFields.map((u) => ({
        // when isSelectAll is true, we use anonymizationAllFields to find the field
        // otherwise, we use updatedAnonymizationData (anonymizationPageFields) to find the field
        ...((anonymizationAllFields?.data ?? []).find((f) => f.field === u.field) ?? {
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
      setAnonymizationFieldsBulkActions(() => {
        return {
          ...anonymizationFieldsBulkActions,
          // Only update makes sense now, as long as we don't have an add new field design/UX
          update: [...updatedFields].reduce(
            (acc, curr) => {
              // This is to ensure that we don't have duplicate fields in the update array
              const existingIndex = acc.findIndex((item) => item.id === curr.id);
              if (existingIndex !== -1) {
                acc[existingIndex] = curr;
              } else {
                acc.push(curr);
              }
              return acc;
            },
            [...(anonymizationFieldsBulkActions?.update ?? [])]
          ),
        };
      });
      setUpdatedAnonymizationData(() => {
        // Update the anonymization data with the updated fields and keep the existing order
        const newAnonymizationData = {
          ...updatedAnonymizationData,
          data: [...updatedAnonymizationData.data].reduce<FindAnonymizationFieldsResponse['data']>(
            (acc, field) => {
              const fieldUpdatedIndex = updatedFieldsKeys.indexOf(field.field);
              if (fieldUpdatedIndex !== -1) {
                acc.push(updatedFields[fieldUpdatedIndex]);
              } else {
                acc.push(field);
              }
              return acc;
            },
            []
          ),
        };
        return newAnonymizationData;
      });
    },
    [anonymizationAllFields?.data, anonymizationFieldsBulkActions, updatedAnonymizationData]
  );

  const handleRowReset = useCallback(
    (field: string) => {
      const originalRow = anonymizationFields.data.find((f) => f.field === field);
      const updatedRowsCount = (anonymizationFieldsBulkActions.update ?? []).length;
      setAnonymizationFieldsBulkActions((prev) => {
        const updatedFields = prev.update?.filter((f) => f.id !== originalRow?.id) ?? [];
        return {
          ...prev,
          update: updatedFields,
        };
      });
      setUpdatedAnonymizationData((prev) => ({
        ...prev,
        data: prev.data.map((d) => {
          return d.id === originalRow?.id ? originalRow : d;
        }, []),
      }));
      setHasPendingChanges(updatedRowsCount - 1 > 0);
    },
    [anonymizationFields.data, anonymizationFieldsBulkActions.update]
  );

  const handlePageReset = useCallback(
    (fields: string[]) => {
      const updatedRowsIds = anonymizationFields.data.reduce<string[]>((acc, curr) => {
        if (fields.includes(curr.field)) {
          acc.push(curr.id);
        }
        return acc;
      }, []);
      const updatedRowsCount = (anonymizationFieldsBulkActions.update ?? []).length;
      setAnonymizationFieldsBulkActions((prev) => {
        const updatedFields = prev.update?.filter((f) => !updatedRowsIds.includes(f.id)) ?? [];
        return {
          ...prev,
          update: updatedFields,
        };
      });
      setUpdatedAnonymizationData((prev) => ({
        ...prev,
        data: anonymizationFields.data,
      }));
      setHasPendingChanges(updatedRowsCount - fields.length > 0);
    },
    [anonymizationFields.data, anonymizationFieldsBulkActions.update]
  );

  return {
    hasPendingChanges,
    onListUpdated,
    resetAnonymizationSettings,
    saveAnonymizationSettings,
    updatedAnonymizationData,
    handleRowReset,
    handlePageReset,
  };
};
