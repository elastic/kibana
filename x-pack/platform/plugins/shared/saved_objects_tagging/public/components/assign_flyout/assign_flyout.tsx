/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
import { EuiFlyoutFooter, EuiFlyoutHeader, EuiFlexItem, Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from '@kbn/core/public';
import { AssignableObject } from '../../../common/assignments';
import { ITagAssignmentService, ITagsCache } from '../../services';
import { parseQuery, computeRequiredChanges } from './lib';
import { AssignmentOverrideMap, AssignmentStatus, AssignmentStatusMap } from './types';
import {
  AssignFlyoutHeader,
  AssignFlyoutSearchBar,
  AssignFlyoutResultList,
  AssignFlyoutFooter,
  AssignFlyoutActionBar,
} from './components';
import { getKey, sortByStatusAndTitle } from './utils';

import './assign_flyout.scss';

interface AssignFlyoutProps {
  tagIds: string[];
  allowedTypes: string[];
  assignmentService: ITagAssignmentService;
  notifications: NotificationsStart;
  tagCache: ITagsCache;
  onClose: () => Promise<void>;
}

const getObjectStatus = (object: AssignableObject, assignedTags: string[]): AssignmentStatus => {
  const assignedCount = assignedTags.reduce((count, tagId) => {
    return count + (object.tags.includes(tagId) ? 1 : 0);
  }, 0);
  return assignedCount === 0 ? 'none' : assignedCount === assignedTags.length ? 'full' : 'partial';
};

export const AssignFlyout: FC<AssignFlyoutProps> = ({
  tagIds,
  tagCache,
  allowedTypes,
  notifications,
  assignmentService,
  onClose,
}) => {
  const [results, setResults] = useState<AssignableObject[]>([]);
  const [query, setQuery] = useState<Query>(Query.parse(''));
  const [initialStatus, setInitialStatus] = useState<AssignmentStatusMap>({});
  const [overrides, setOverrides] = useState<AssignmentOverrideMap>({});
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isSaving, setSaving] = useState<boolean>(false);
  const [initiallyAssigned, setInitiallyAssigned] = useState<number>(0);
  const [pendingChangeCount, setPendingChangeCount] = useState<number>(0);

  // refresh the results when `query` is updated
  useEffect(() => {
    const refreshResults = async () => {
      setLoading(true);
      const { queryText, selectedTypes } = parseQuery(query);

      const fetched = await assignmentService.findAssignableObjects({
        search: queryText ? `${queryText}*` : undefined,
        types: selectedTypes,
        maxResults: 1000,
      });

      const fetchedStatus = fetched.reduce((status, result) => {
        return {
          ...status,
          [getKey(result)]: getObjectStatus(result, tagIds),
        };
      }, {} as AssignmentStatusMap);
      const assignedCount = Object.values(fetchedStatus).filter(
        (status) => status !== 'none'
      ).length;

      setResults(sortByStatusAndTitle(fetched, fetchedStatus));
      setOverrides({});
      setInitialStatus(fetchedStatus);
      setInitiallyAssigned(assignedCount);
      setPendingChangeCount(0);
      setLoading(false);
    };

    refreshResults();
  }, [query, assignmentService, tagIds]);

  // refresh the pending changes count when `overrides` is update
  useEffect(() => {
    const changes = computeRequiredChanges({ objects: results, initialStatus, overrides });
    setPendingChangeCount(changes.assigned.length + changes.unassigned.length);
  }, [initialStatus, overrides, results]);

  const onSave = useCallback(async () => {
    setSaving(true);
    const changes = computeRequiredChanges({ objects: results, initialStatus, overrides });
    await assignmentService.updateTagAssignments({
      tags: tagIds,
      assign: changes.assigned.map(({ type, id }) => ({ type, id })),
      unassign: changes.unassigned.map(({ type, id }) => ({ type, id })),
    });

    notifications.toasts.addSuccess(
      i18n.translate('xpack.savedObjectsTagging.assignFlyout.successNotificationTitle', {
        defaultMessage:
          'Saved assignments to {count, plural, one {1 saved object} other {# saved objects}}',
        values: {
          count: changes.assigned.length + changes.unassigned.length,
        },
      })
    );
    onClose();
  }, [tagIds, results, initialStatus, overrides, notifications, assignmentService, onClose]);

  const resetAll = useCallback(() => {
    setOverrides({});
  }, []);

  const selectAll = useCallback(() => {
    setOverrides(
      results.reduce((status, result) => {
        return {
          ...status,
          [getKey(result)]: 'selected',
        };
      }, {} as AssignmentOverrideMap)
    );
  }, [results]);

  const deselectAll = useCallback(() => {
    setOverrides(
      results.reduce((status, result) => {
        return {
          ...status,
          [getKey(result)]: 'deselected',
        };
      }, {} as AssignmentOverrideMap)
    );
  }, [results]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <AssignFlyoutHeader tagIds={tagIds} tagCache={tagCache} />
      </EuiFlyoutHeader>
      <EuiFlyoutHeader hasBorder className="tagAssignFlyout_searchContainer">
        <AssignFlyoutSearchBar
          onChange={({ query: newQuery }) => {
            setQuery(newQuery);
          }}
          isLoading={isLoading}
          types={allowedTypes}
        />
        <AssignFlyoutActionBar
          resultCount={results.length}
          initiallyAssigned={initiallyAssigned}
          pendingChanges={pendingChangeCount}
          onReset={resetAll}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
        />
      </EuiFlyoutHeader>
      <EuiFlexItem grow={1}>
        <AssignFlyoutResultList
          results={results}
          isLoading={isLoading}
          initialStatus={initialStatus}
          overrides={overrides}
          onChange={(newOverrides) => {
            setOverrides((oldOverrides) => ({
              ...oldOverrides,
              ...newOverrides,
            }));
          }}
        />
      </EuiFlexItem>
      <EuiFlyoutFooter>
        <AssignFlyoutFooter
          isSaving={isSaving}
          hasPendingChanges={pendingChangeCount > 0}
          onSave={onSave}
          onCancel={onClose}
        />
      </EuiFlyoutFooter>
    </>
  );
};
