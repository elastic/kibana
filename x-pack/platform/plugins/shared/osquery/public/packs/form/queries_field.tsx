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
import { getSupportedPlatforms } from '../queries/platforms';
import type { PackQueryFormData } from '../queries/use_pack_query_form';
import { serializeSchedule, deserializeSchedule } from './schedule_serializer';
import type { ScheduleFormData } from '../../components/schedule_section/types';

interface QueriesFieldProps {
  euiFieldProps: EuiComboBoxProps<{}>;
  editMode?: boolean;
}

const QueriesFieldComponent: React.FC<QueriesFieldProps> = ({
  euiFieldProps,
  editMode = false,
}) => {
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
  const packName = useWatch({ name: 'name' });
  const packScheduleFormData = useWatch({ name: 'schedule' }) as ScheduleFormData | undefined;

  const packSchedule = useMemo(
    () => (packScheduleFormData ? serializeSchedule(packScheduleFormData) : undefined),
    [packScheduleFormData]
  );

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
          update(
            showEditQueryFlyout,
            produce({}, (draft: PackQueryFormData) => {
              draft.id = updatedQuery.id;
              draft.interval = updatedQuery.interval;
              draft.query = updatedQuery.query;
              draft.timeout = updatedQuery.timeout;

              if (updatedQuery.platform?.length) {
                draft.platform = updatedQuery.platform;
              }

              if (updatedQuery.version?.length) {
                draft.version = updatedQuery.version;
              }

              if (updatedQuery.ecs_mapping) {
                draft.ecs_mapping = updatedQuery.ecs_mapping;
              }

              draft.snapshot = updatedQuery.snapshot;
              draft.removed = updatedQuery.removed;

              if (updatedQuery.schedule_type) {
                draft.schedule_type = updatedQuery.schedule_type;
              } else {
                delete draft.schedule_type;
              }

              if (updatedQuery.rrule_schedule) {
                draft.rrule_schedule = updatedQuery.rrule_schedule;
              } else {
                delete draft.rrule_schedule;
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
              // ECS mappings ride in the osquery object form, which is what the
              // pack form field (`PackQueryFormData.ecs_mapping`) stores — pass
              // through as-is (mirrors the manual query-edit path). Preserving it
              // here is what makes an exported pack round-trip 1:1.
              ecs_mapping: newQuery.ecs_mapping ?? parsedContent.ecs_mapping,
            },
            // Keep every value the file actually specified. `isEmpty` cannot be
            // used as the keep-predicate here: `isEmpty(number)` and
            // `isEmpty(boolean)` both return true, so numeric `timeout`/`interval`
            // and boolean `snapshot`/`removed` (including `true`) would be
            // silently dropped on re-import. Keep anything that is not
            // undefined/null/'' so numbers and booleans survive verbatim.
            (value) => value !== undefined && value !== null && value !== ''
          )
        )
      );

      // In EDIT mode the form is already populated with the existing pack's
      // metadata/schedule/enabled flag; an upload must not clobber it. Only a
      // fresh CREATE flow adopts the file's name/description/schedule and forces
      // the pack disabled.
      if (!editMode) {
        // A Kibana-pack JSON carries its own `name`/`description`; prefer those
        // so the pack reconstructs 1:1 across clusters. Fall back to the
        // filename for community `.conf` files that have no in-file name.
        if (!isEmpty(parsedContent.name)) {
          setValue('name', parsedContent.name);
        } else {
          handleNameChange(uploadedPackName);
        }

        if (!isEmpty(parsedContent.description)) {
          setValue('description', parsedContent.description);
        }

        // Imported packs land disabled regardless of any `enabled` in the file:
        // the operator assigns target-cluster policies and enables deliberately.
        setValue('enabled', false);

        // Pack-level schedule (rrule / interval), carried 1:1 when the file has
        // one. Presence is the gate: export only emits it when the source pack
        // had a schedule (rruleScheduling on), and on a flag-off target the
        // form's deserializer/submit path strips it — so setting it here is safe
        // either way and dormant until the feature ships.
        if (!isEmpty(parsedContent.schedule_type)) {
          setValue(
            'schedule',
            deserializeSchedule({
              schedule_type: parsedContent.schedule_type,
              interval: parsedContent.interval,
              rrule_schedule: parsedContent.rrule_schedule,
            })
          );
        }
      }
    },
    [editMode, handleNameChange, replace, setValue]
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
          packSchedule={packSchedule}
        />
      ) : null}
      <EuiSpacer />
      {!isReadOnly && <OsqueryPackUploader onChange={handlePackUpload} />}
      {showAddQueryFlyout && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          onSave={handleAddQuery}
          onClose={handleHideAddFlyout}
          packSchedule={packSchedule}
        />
      )}
      {showEditQueryFlyout != null && showEditQueryFlyout >= 0 && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          // @ts-expect-error update types
          defaultValue={fieldValue[showEditQueryFlyout]}
          onSave={handleEditQuery}
          onClose={handleHideEditFlyout}
          packSchedule={packSchedule}
        />
      )}
    </>
  );
};

export const QueriesField = React.memo(QueriesFieldComponent, deepEqual);
