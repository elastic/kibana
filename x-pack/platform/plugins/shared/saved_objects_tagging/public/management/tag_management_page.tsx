/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { Subject } from 'rxjs';
import useMount from 'react-use/lib/useMount';
import { Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { EuiSpacer } from '@elastic/eui';
import type { TagsCapabilities } from '../../common';
import type { TagWithRelations } from '../../common/types';
import type { MergeStatusResponse } from '../../common/merge';
import { getCreateModalOpener } from '../components/edition_modal';
import type {
  ITagInternalClient,
  ITagAssignmentService,
  ITagsCache,
  IMergeClient,
} from '../services';
import type { TagBulkAction } from './types';
import {
  Header,
  TagTable,
  ActionBar,
  DuplicateTagsCallout,
  MergeInProgressCallout,
  MergeDuplicateTagsFlyout,
} from './components';
import { getTableActions } from './actions';
import { getBulkActions } from './bulk_actions';
import {
  getTagConnectionsUrl,
  groupDuplicateTagsByName,
  buildTagNameLookup,
  type DuplicateTagGroup,
} from './utils';

const MERGE_STATUS_POLL_INTERVAL_MS = 5000;

interface TagManagementPageParams {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  core: CoreStart;
  tagClient: ITagInternalClient;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  mergeClient: IMergeClient;
  capabilities: TagsCapabilities;
  assignableTypes: string[];
}

export const TagManagementPage: FC<TagManagementPageParams> = ({
  setBreadcrumbs,
  core,
  tagClient,
  tagCache,
  assignmentService,
  mergeClient,
  capabilities,
  assignableTypes,
}) => {
  const { application, http, ...startServices } = core;
  const [loading, setLoading] = useState<boolean>(false);
  const [allTags, setAllTags] = useState<TagWithRelations[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagWithRelations[]>([]);
  const [query, setQuery] = useState<Query | undefined>();
  const [mergingGroup, setMergingGroup] = useState<DuplicateTagGroup | undefined>();
  const [mergeStatus, setMergeStatus] = useState<MergeStatusResponse | undefined>();

  const filteredTags = useMemo(() => {
    return query ? Query.execute(query, allTags) : allTags;
  }, [allTags, query]);

  const unmount$ = useMemo(() => {
    return new Subject<void>();
  }, []);

  useEffect(() => {
    return () => {
      unmount$.next();
    };
  }, [unmount$]);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const { tags } = await tagClient.find({
      page: 1,
      perPage: 10000,
    });
    setAllTags(tags);
    setLoading(false);
  }, [tagClient]);

  // A merge job deletes duplicate source tags server-side, via an async Task Manager task, not
  // through this client — so the shared `TagsCache` (used by tag pickers elsewhere in the app)
  // never sees it through its normal onDidDelete hook. Force a refresh so those pickers don't
  // keep offering deleted tags until the cache's own periodic refresh or a page reload.
  const refreshAfterMerge = useCallback(async () => {
    await Promise.all([fetchTags(), tagClient.invalidateCache()]);
  }, [fetchTags, tagClient]);

  useMount(() => {
    fetchTags();
  });

  // Merge jobs are singleton per space and run entirely server-side, so one can still be running
  // (or finish) even if the flyout that started it was never opened on this page load. Poll
  // independently of the flyout so both the "in progress" banner and the tag list itself
  // (including the now-stale duplicate-tags warning once source tags are deleted) stay correct
  // even when nothing ever opened the flyout to trigger its own `onMerged` refresh.
  const wasInProgressRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const result = await mergeClient.status();
        if (cancelled) {
          return;
        }
        setMergeStatus(result);
        if (wasInProgressRef.current && result.status !== 'in_progress') {
          refreshAfterMerge();
        }
        wasInProgressRef.current = result.status === 'in_progress';
      } catch (e) {
        // best-effort awareness banner; a failed poll just tries again next interval.
      }
    };
    poll();
    const interval = setInterval(poll, MERGE_STATUS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mergeClient, refreshAfterMerge]);

  const getTagName = useMemo(() => buildTagNameLookup(allTags), [allTags]);
  const duplicateGroups = useMemo(() => groupDuplicateTagsByName(allTags), [allTags]);

  const viewMergeProgress = useCallback(() => {
    const runningToId = mergeStatus?.job?.toId;
    const runningGroup = duplicateGroups.find((group) =>
      group.tags.some((tag) => tag.id === runningToId)
    );
    setMergingGroup(runningGroup ?? { normalizedName: '', tags: [] });
  }, [mergeStatus, duplicateGroups]);

  const createModalOpener = useMemo(
    () => getCreateModalOpener({ ...startServices, tagClient }),
    [startServices, tagClient]
  );

  const tableActions = useMemo(() => {
    return getTableActions({
      startServices,
      capabilities,
      tagClient,
      tagCache,
      assignmentService,
      setLoading,
      assignableTypes,
      fetchTags,
      canceled$: unmount$,
    });
  }, [
    startServices,
    capabilities,
    tagClient,
    tagCache,
    assignmentService,
    setLoading,
    assignableTypes,
    fetchTags,
    unmount$,
  ]);

  const bulkActions = useMemo(() => {
    return getBulkActions({
      startServices,
      capabilities,
      tagClient,
      tagCache,
      assignmentService,
      setLoading,
      assignableTypes,
      clearSelection: () => setSelectedTags([]),
    });
  }, [startServices, capabilities, tagClient, tagCache, assignmentService, assignableTypes]);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.savedObjectsTagging.management.breadcrumb.index', {
          defaultMessage: 'Tags',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

  const { notifications } = startServices;

  const openCreateModal = useCallback(() => {
    createModalOpener({
      onCreate: (createdTag) => {
        fetchTags();
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.savedObjectsTagging.notifications.createTagSuccessTitle', {
            defaultMessage: 'Created "{name}" tag',
            values: {
              name: createdTag.name,
            },
          }),
        });
      },
    });
  }, [notifications, createModalOpener, fetchTags]);

  const getTagRelationUrl = useCallback(
    (tag: TagWithRelations) => {
      return getTagConnectionsUrl(tag, http.basePath);
    },
    [http]
  );

  const showTagRelations = useCallback(
    (tag: TagWithRelations) => {
      application.navigateToUrl(getTagRelationUrl(tag));
    },
    [application, getTagRelationUrl]
  );

  const executeBulkAction = useCallback(
    async (action: TagBulkAction) => {
      try {
        await action.execute(
          selectedTags.map(({ id }) => id),
          { canceled$: unmount$ }
        );
      } catch (e) {
        notifications.toasts.addError(e, {
          title: i18n.translate('xpack.savedObjectsTagging.notifications.bulkActionError', {
            defaultMessage: 'An error occurred',
          }),
        });
      } finally {
        setLoading(false);
      }
      if (action.refreshAfterExecute) {
        await fetchTags();
      }
    },
    [selectedTags, fetchTags, notifications, unmount$]
  );

  const actionBar = useMemo(
    () => (
      <ActionBar
        actions={bulkActions}
        totalCount={filteredTags.length}
        selectedCount={selectedTags.length}
        onActionSelected={executeBulkAction}
      />
    ),
    [selectedTags, filteredTags, bulkActions, executeBulkAction]
  );

  return (
    <>
      <Header canCreate={capabilities.create} onCreate={openCreateModal} />
      <EuiSpacer size="l" />
      {mergeStatus?.status === 'in_progress' && (
        <MergeInProgressCallout
          tagName={mergeStatus.job ? getTagName(mergeStatus.job.toId) : undefined}
          onViewProgress={viewMergeProgress}
        />
      )}
      <DuplicateTagsCallout groups={duplicateGroups} onMergeGroup={setMergingGroup} />
      <TagTable
        loading={loading}
        tags={filteredTags}
        capabilities={capabilities}
        actionBar={actionBar}
        actions={tableActions}
        initialQuery={query}
        onQueryChange={(newQuery) => {
          setQuery(newQuery);
          setSelectedTags([]);
        }}
        allowSelection={bulkActions.length > 0}
        selectedTags={selectedTags}
        onSelectionChange={(tags) => {
          setSelectedTags(tags);
        }}
        getTagRelationUrl={getTagRelationUrl}
        onShowRelations={(tag) => {
          showTagRelations(tag);
        }}
      />
      {mergingGroup && (
        <MergeDuplicateTagsFlyout
          tags={mergingGroup.tags}
          allTags={allTags}
          mergeClient={mergeClient}
          onClose={() => setMergingGroup(undefined)}
          onMerged={refreshAfterMerge}
        />
      )}
    </>
  );
};
