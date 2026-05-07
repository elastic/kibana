/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, findIndex, indexOf, pickBy, uniq, map } from 'lodash';
import type { EuiComboBoxProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { produce } from 'immer';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { useController, useFormContext, useWatch, useFieldArray } from 'react-hook-form';

import { QUERY_TIMEOUT } from '../../../common/constants';
import { PackQueriesTable } from '../pack_queries_table';
import { QueryFlyout } from '../queries/query_flyout';
import { OsqueryPackUploader } from './pack_uploader';
import { getSupportedPlatforms } from '../queries/platforms/helpers';
import type { PackQueryFormData } from '../queries/use_pack_query_form';
import type { ScheduleFormData } from '../../components/schedule_section';
import { useIsExperimentalFeatureEnabled } from '../../common/experimental_features_context';

interface QueriesFieldProps {
  euiFieldProps: EuiComboBoxProps<{}>;
}

const QueriesFieldComponent: React.FC<QueriesFieldProps> = ({ euiFieldProps }) => {
  const {
    field: { value: fieldValue },
  } = useController<{ queries: PackQueryFormData[] }, 'queries'>({
    name: 'queries',
    defaultValue: [],
    rules: {},
  });

  const { append, remove, update, replace } = useFieldArray({
    name: 'queries',
  });

  const { setValue } = useFormContext();
  const { name: packName } = useWatch();
  const isRRuleSchedulingEnabled = useIsExperimentalFeatureEnabled('rruleScheduling');

  // Snapshot of the pack-level schedule form fields, used to seed per-query
  // schedule defaults inside the QueryFlyout. We deliberately read each field
  // explicitly rather than spreading `useWatch()` so renames in either form
  // surface as type errors.
  const packScheduleFormFields = useWatch();
  const packDefaultSchedule = useMemo<ScheduleFormData | undefined>(() => {
    if (!isRRuleSchedulingEnabled) {
      return undefined;
    }

    const {
      schedule_type,
      interval,
      start_date,
      end_date,
      end_date_enabled,
      splay_enabled,
      splay_value,
      splay_unit,
      frequency,
      repeat_every,
      byweekday,
      bymonthday,
      bymonth,
    } = packScheduleFormFields as Partial<ScheduleFormData>;

    if (schedule_type === undefined) {
      return undefined;
    }

    return {
      schedule_type,
      interval: interval ?? 3600,
      start_date: start_date ?? '',
      end_date: end_date ?? '',
      end_date_enabled: end_date_enabled ?? false,
      splay_enabled: splay_enabled ?? false,
      splay_value: splay_value ?? 5,
      splay_unit: splay_unit ?? 'minutes',
      frequency: frequency ?? 'daily',
      repeat_every: repeat_every ?? 1,
      byweekday: byweekday ?? [],
      bymonthday: bymonthday ?? 1,
      bymonth: bymonth ?? 1,
    };
  }, [isRRuleSchedulingEnabled, packScheduleFormFields]);

  const handleNameChange = useCallback(
    (newName: string) => isEmpty(packName) && setValue('name', newName),
    [packName, setValue]
  );

  const isReadOnly = !!euiFieldProps?.isDisabled;
  const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);
  const [showEditQueryFlyout, setShowEditQueryFlyout] = useState<number>(-1);
  const [tableSelectedItems, setTableSelectedItems] = useState<PackQueryFormData[]>([]);

  const handleShowAddFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
  const handleHideAddFlyout = useCallback(() => setShowAddQueryFlyout(false), []);
  const handleHideEditFlyout = useCallback(() => setShowEditQueryFlyout(-1), []);

  const handleDeleteClick = useCallback(
    (query: any) => {
      const streamIndex = findIndex(fieldValue, ['id', query.id]);

      if (streamIndex > -1) {
        remove(streamIndex);
      }
    },
    [fieldValue, remove]
  );

  const handleEditClick = useCallback(
    (query: any) => {
      const streamIndex = findIndex(fieldValue, ['id', query.id]);

      setShowEditQueryFlyout(streamIndex);
    },
    [fieldValue]
  );

  const handleEditQuery = useCallback(
    (updatedQuery: any) =>
      new Promise<void>((resolve) => {
        if (showEditQueryFlyout >= 0) {
          // The flyout's onSave hands us the serialized SO shape (with
          // `schedule_type`/`rrule_schedule` set when overriding). We store
          // it as-is on the field array so the deserializer can reconstruct
          // the user's choices the next time the flyout opens — picking out
          // individual fields here would silently drop schedule overrides.
          update(
            showEditQueryFlyout,
            produce(updatedQuery, (draft: PackQueryFormData) => {
              if (updatedQuery.platform?.length) {
                draft.platform = updatedQuery.platform;
              }

              if (updatedQuery.version?.length) {
                draft.version = updatedQuery.version;
              }

              if (updatedQuery.ecs_mapping) {
                draft.ecs_mapping = updatedQuery.ecs_mapping;
              }

              return draft;
            })
          );
        }

        handleHideEditFlyout();
        resolve();
      }),
    [handleHideEditFlyout, update, showEditQueryFlyout]
  );

  const handleAddQuery = useCallback(
    (newQuery: any) =>
      new Promise<void>((resolve) => {
        append(newQuery);
        handleHideAddFlyout();
        resolve();
      }),
    [handleHideAddFlyout, append]
  );

  const handleDeleteQueries = useCallback(() => {
    const idsToRemove = map(tableSelectedItems, (selectedItem) =>
      indexOf(fieldValue, selectedItem)
    );
    remove(idsToRemove);
    setTableSelectedItems([]);
  }, [fieldValue, remove, tableSelectedItems]);

  const handlePackUpload = useCallback(
    (parsedContent: any, uploadedPackName: any) => {
      replace(
        map(parsedContent.queries, (newQuery, newQueryId) =>
          pickBy(
            {
              id: newQueryId,
              interval: newQuery.interval ?? parsedContent.interval ?? '3600',
              timeout: newQuery.timeout ?? parsedContent.timeout ?? QUERY_TIMEOUT.DEFAULT,
              query: newQuery.query,
              version: newQuery.version ?? parsedContent.version,
              snapshot: newQuery.snapshot ?? parsedContent.snapshot,
              removed: newQuery.removed ?? parsedContent.removed,
              platform: getSupportedPlatforms(newQuery.platform ?? parsedContent.platform),
            },
            (value) => !isEmpty(value) || value === false
          )
        )
      );

      handleNameChange(uploadedPackName);
    },
    [handleNameChange, replace]
  );

  const tableData = useMemo(() => (fieldValue?.length ? fieldValue : []), [fieldValue]);
  const uniqueQueryIds = useMemo<string[]>(() => uniq(map(fieldValue, 'id')), [fieldValue]);

  return (
    <>
      {!isReadOnly && (
        <>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {!tableSelectedItems.length ? (
                <EuiButton
                  data-test-subj="add-query-button"
                  fill
                  onClick={handleShowAddFlyout}
                  iconType="plusCircle"
                >
                  <FormattedMessage
                    id="xpack.osquery.pack.queriesForm.addQueryButtonLabel"
                    defaultMessage="Add query"
                  />
                </EuiButton>
              ) : (
                <EuiButton color="danger" onClick={handleDeleteQueries} iconType="trash">
                  <FormattedMessage
                    id="xpack.osquery.pack.table.deleteQueriesButtonLabel"
                    defaultMessage="Delete {queriesCount, plural, one {# query} other {# queries}}"
                    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                    values={{
                      queriesCount: tableSelectedItems.length,
                    }}
                  />
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      )}
      {fieldValue?.length ? (
        <PackQueriesTable
          data={tableData}
          isReadOnly={isReadOnly}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          selectedItems={tableSelectedItems}
          setSelectedItems={setTableSelectedItems}
        />
      ) : null}
      <EuiSpacer />
      {!isReadOnly && <OsqueryPackUploader onChange={handlePackUpload} />}
      {showAddQueryFlyout && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          packDefaultSchedule={packDefaultSchedule}
          onSave={handleAddQuery}
          onClose={handleHideAddFlyout}
        />
      )}
      {showEditQueryFlyout != null && showEditQueryFlyout >= 0 && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          // @ts-expect-error update types
          defaultValue={fieldValue[showEditQueryFlyout]}
          packDefaultSchedule={packDefaultSchedule}
          onSave={handleEditQuery}
          onClose={handleHideEditFlyout}
        />
      )}
    </>
  );
};

export const QueriesField = React.memo(QueriesFieldComponent, deepEqual);
