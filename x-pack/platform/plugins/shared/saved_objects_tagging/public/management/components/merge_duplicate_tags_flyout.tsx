/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiRadio,
  EuiCheckbox,
  EuiButton,
  EuiButtonEmpty,
  EuiProgress,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiConfirmModal,
  EuiLoadingSpinner,
  EuiLink,
  EuiIconTip,
  EuiBasicTable,
  EuiInMemoryTable,
  type EuiBasicTableColumn,
  type Criteria,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TagWithRelations } from '../../../common/types';
import type {
  MergeJobPhase,
  MergeAffectedObject,
  MergePreviewObjectsResponse,
  MergePreviewResponse,
  MergeStatusResponse,
} from '../../../common/merge';
import type { IMergeClient } from '../../services';
import { TagBadge } from '../../components';
import { buildTagNameLookup } from '../utils';

const POLL_INTERVAL_MS = 2000;
const AFFECTED_OBJECTS_PAGE_SIZE = 10;

type Step = 'select' | 'preview' | 'running' | 'done';

export interface MergeDuplicateTagsFlyoutProps {
  /** The duplicate-name group (2+ tags) to merge; may include managed tags (shown read-only). */
  tags: TagWithRelations[];
  /**
   * Every tag in the space, used only to resolve the running/finished job's canonical tag id
   * (`status.job.toId`) to a name. Merge jobs are singleton per space, so the job this flyout
   * reattaches to on open may belong to a *different* duplicate-name group than `tags` — without
   * this, there would be no way to tell the user which tag is actually being merged.
   */
  allTags: TagWithRelations[];
  mergeClient: IMergeClient;
  onClose: () => void;
  /** Called when the flyout closes after a merge actually ran, so the tags list can be refreshed. */
  onMerged: () => void;
}

const errorMessage = (e: unknown): string =>
  (e as { body?: { message?: string } })?.body?.message ?? (e as Error).message;

const affectedObjectsColumns: Array<EuiBasicTableColumn<MergeAffectedObject>> = [
  {
    field: 'title',
    name: i18n.translate('xpack.savedObjectsTagging.management.merge.preview.table.title', {
      defaultMessage: 'Title',
    }),
    render: (title: string | undefined, object: MergeAffectedObject) => title ?? object.id,
  },
  {
    field: 'type',
    name: i18n.translate('xpack.savedObjectsTagging.management.merge.preview.table.type', {
      defaultMessage: 'Type',
    }),
  },
];

const phaseLabel = (phase: MergeJobPhase) => {
  switch (phase) {
    case 'scanning':
      return i18n.translate('xpack.savedObjectsTagging.management.merge.phase.scanning', {
        defaultMessage: 'Scanning for affected objects…',
      });
    case 'updating':
      return i18n.translate('xpack.savedObjectsTagging.management.merge.phase.updating', {
        defaultMessage: 'Updating tagged objects…',
      });
    case 'finalizing':
      return i18n.translate('xpack.savedObjectsTagging.management.merge.phase.finalizing', {
        defaultMessage: 'Deleting merged tags…',
      });
    case 'complete':
    default:
      return i18n.translate('xpack.savedObjectsTagging.management.merge.phase.complete', {
        defaultMessage: 'Complete',
      });
  }
};

export const MergeDuplicateTagsFlyout: FC<MergeDuplicateTagsFlyoutProps> = ({
  tags,
  allTags,
  mergeClient,
  onClose,
  onMerged,
}) => {
  const selectableTags = useMemo(() => tags.filter((tag) => !tag.managed), [tags]);

  const getTagName = useMemo(() => buildTagNameLookup(allTags), [allTags]);
  const runningJobTagName = (job: MergeStatusResponse['job']) =>
    job ? getTagName(job.toId) ?? job.toId : undefined;
  // For rendering an actual colored badge (not just a name) for a source tag that couldn't be
  // deleted — it may not be in `tags` (the group this flyout was opened for) if this flyout
  // reattached to a job for a different group, but it will still be in `allTags` since it wasn't
  // actually deleted.
  const getTagById = useMemo(() => new Map(allTags.map((tag) => [tag.id, tag])), [allTags]);

  const [step, setStep] = useState<Step>('select');
  const [canonicalId, setCanonicalId] = useState<string | undefined>(selectableTags[0]?.id);
  const [deleteSources, setDeleteSources] = useState(false);
  const [preview, setPreview] = useState<MergePreviewResponse | undefined>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAffectedObjects, setShowAffectedObjects] = useState(false);
  const [affectedObjectsPage, setAffectedObjectsPage] = useState(0);
  const [affectedObjects, setAffectedObjects] = useState<MergePreviewObjectsResponse | undefined>();
  const [affectedObjectsLoading, setAffectedObjectsLoading] = useState(false);
  const [status, setStatus] = useState<MergeStatusResponse | undefined>();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [ranMerge, setRanMerge] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [checkingExistingJob, setCheckingExistingJob] = useState(true);

  const canonicalTag = selectableTags.find((tag) => tag.id === canonicalId);
  const fromIds = useMemo(
    () => selectableTags.filter((tag) => tag.id !== canonicalId).map((tag) => tag.id),
    [selectableTags, canonicalId]
  );

  const goToPreview = useCallback(async () => {
    if (!canonicalId) {
      return;
    }
    setStep('preview');
    setPreviewLoading(true);
    setError(undefined);
    try {
      const result = await mergeClient.preview({ toId: canonicalId, fromIds });
      setPreview(result);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPreviewLoading(false);
    }
  }, [mergeClient, canonicalId, fromIds]);

  const loadAffectedObjects = useCallback(
    async (page: number) => {
      if (!canonicalId) {
        return;
      }
      setAffectedObjectsLoading(true);
      try {
        const result = await mergeClient.previewObjects({
          toId: canonicalId,
          fromIds,
          page: page + 1,
          perPage: AFFECTED_OBJECTS_PAGE_SIZE,
        });
        setAffectedObjects(result);
        setAffectedObjectsPage(page);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setAffectedObjectsLoading(false);
      }
    },
    [mergeClient, canonicalId, fromIds]
  );

  const toggleAffectedObjects = useCallback(() => {
    setShowAffectedObjects((shown) => {
      const next = !shown;
      if (next && !affectedObjects) {
        loadAffectedObjects(0);
      }
      return next;
    });
  }, [affectedObjects, loadAffectedObjects]);

  const startMerge = useCallback(async () => {
    if (!canonicalId) {
      return;
    }
    setError(undefined);
    try {
      await mergeClient.start({ toId: canonicalId, fromIds, deleteSources });
      setRanMerge(true);
      setStep('running');
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [mergeClient, canonicalId, fromIds, deleteSources]);

  // A merge job is singleton-per-space and runs entirely server-side, so closing this flyout
  // (or navigating away) never stops or fails it. Reopening always started fresh at tag
  // selection, with no way to see the still-running job — worse, trying to start a new one just
  // 409'd. Check for an in-progress job on mount and reattach straight to `running` if there is
  // one, regardless of which duplicate group this flyout instance was opened for (the `running`
  // and `done` steps don't reference the local tag selection, so this is always safe to show).
  useEffect(() => {
    let cancelled = false;
    mergeClient
      .status()
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.status === 'in_progress') {
          setStatus(result);
          setRanMerge(true);
          setStep('running');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(errorMessage(e));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingExistingJob(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // deliberately run once on mount only: re-running this on every `mergeClient` identity
    // change would fight with the user's own navigation through the select/preview steps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll job status while running; stop as soon as it's no longer in progress.
  useEffect(() => {
    if (step !== 'running') {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const result = await mergeClient.status();
        if (cancelled) {
          return;
        }
        setStatus(result);
        if (result.status !== 'in_progress') {
          setStep('done');
        }
      } catch (e) {
        if (!cancelled) {
          setError(errorMessage(e));
        }
      }
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [step, mergeClient]);

  const confirmCancel = useCallback(async () => {
    setConfirmingCancel(false);
    try {
      await mergeClient.cancel();
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [mergeClient]);

  const handleClose = useCallback(() => {
    if (ranMerge) {
      onMerged();
    }
    onClose();
  }, [ranMerge, onMerged, onClose]);

  const errorCallout = error && (
    <>
      <EuiCallOut
        color="danger"
        title={i18n.translate('xpack.savedObjectsTagging.management.merge.errorTitle', {
          defaultMessage: 'An error occurred',
        })}
      >
        {error}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (checkingExistingJob) {
    body = <EuiLoadingSpinner size="l" />;
    footer = (
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onClose}>
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.merge.cancelButton"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else if (step === 'select') {
    const selectColumns: Array<EuiBasicTableColumn<TagWithRelations>> = [
      {
        field: 'id',
        name: '',
        width: '32px',
        render: (_id: string, tag: TagWithRelations) => (
          <EuiRadio
            id={`mergeDuplicateTagsRadio-${tag.id}`}
            data-test-subj={`mergeDuplicateTagsRadio-${tag.id}`}
            checked={tag.id === canonicalId}
            disabled={tag.managed}
            onChange={() => setCanonicalId(tag.id)}
            aria-label={i18n.translate(
              'xpack.savedObjectsTagging.management.merge.select.table.keepAriaLabel',
              { defaultMessage: 'Keep the "{name}" tag', values: { name: tag.name } }
            )}
          />
        ),
      },
      {
        field: 'name',
        name: i18n.translate('xpack.savedObjectsTagging.management.merge.select.table.tag', {
          defaultMessage: 'Tag',
        }),
        sortable: true,
        render: (_name: string, tag: TagWithRelations) => (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <TagBadge tag={tag} />
            </EuiFlexItem>
            {tag.managed && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="lock"
                  content={i18n.translate(
                    'xpack.savedObjectsTagging.management.merge.select.table.managedTooltip',
                    {
                      defaultMessage: 'This tag is managed by Elastic and cannot be merged.',
                    }
                  )}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'description',
        name: i18n.translate(
          'xpack.savedObjectsTagging.management.merge.select.table.description',
          { defaultMessage: 'Description' }
        ),
        sortable: true,
        render: (description: string) => description || null,
      },
      {
        field: 'relationCount',
        name: i18n.translate(
          'xpack.savedObjectsTagging.management.merge.select.table.connections',
          { defaultMessage: 'Connections' }
        ),
        sortable: true,
        render: (count: number) =>
          i18n.translate('xpack.savedObjectsTagging.management.merge.select.connectionCount', {
            defaultMessage: '{count, plural, one {1 saved object} other {# saved objects}}',
            values: { count },
          }),
      },
    ];

    const selectTableSorting = {
      sort: { field: 'relationCount' as const, direction: 'desc' as const },
    };

    body = (
      <>
        {errorCallout}
        <EuiText size="s">
          <FormattedMessage
            id="xpack.savedObjectsTagging.management.merge.select.description"
            defaultMessage="Choose the tag to keep. All other tags with this name will be merged into it, and every saved object that references them will be updated to use the tag you keep."
          />
        </EuiText>
        <EuiSpacer size="m" />
        {selectableTags.length < 2 ? (
          <EuiCallOut
            color="danger"
            title={i18n.translate(
              'xpack.savedObjectsTagging.management.merge.select.notEnoughTags',
              {
                defaultMessage: 'Not enough non-managed tags in this group to merge.',
              }
            )}
          />
        ) : (
          <EuiInMemoryTable
            data-test-subj="mergeDuplicateTagsSelectTable"
            items={tags}
            columns={selectColumns}
            sorting={selectTableSorting}
            rowProps={(tag) =>
              tag.managed
                ? {}
                : { onClick: () => setCanonicalId(tag.id), css: { cursor: 'pointer' } }
            }
          />
        )}
      </>
    );

    footer = (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onClose}>
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.merge.cancelButton"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="mergeDuplicateTagsNextButton"
            fill
            disabled={!canonicalId || selectableTags.length < 2}
            onClick={goToPreview}
          >
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.merge.nextButton"
              defaultMessage="Next"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else if (step === 'preview') {
    body = (
      <>
        {errorCallout}
        {previewLoading || !preview ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.savedObjectsTagging.management.merge.preview.affectedCount"
                defaultMessage='{count, plural, one {1 saved object} other {# saved objects}} will be updated to use the "{name}" tag.'
                values={{ count: preview.affectedCount, name: canonicalTag?.name }}
              />{' '}
              {preview.affectedCount > 0 && (
                <EuiLink
                  data-test-subj="mergeDuplicateTagsViewAffectedObjectsLink"
                  onClick={toggleAffectedObjects}
                >
                  {showAffectedObjects
                    ? i18n.translate(
                        'xpack.savedObjectsTagging.management.merge.preview.hideAffectedObjects',
                        { defaultMessage: 'Hide affected objects' }
                      )
                    : i18n.translate(
                        'xpack.savedObjectsTagging.management.merge.preview.viewAffectedObjects',
                        { defaultMessage: 'View affected objects' }
                      )}
                </EuiLink>
              )}
            </EuiText>
            {showAffectedObjects && (
              <>
                <EuiSpacer size="s" />
                <EuiBasicTable
                  data-test-subj="mergeDuplicateTagsAffectedObjectsTable"
                  loading={affectedObjectsLoading}
                  items={affectedObjects?.objects ?? []}
                  columns={affectedObjectsColumns}
                  pagination={{
                    pageIndex: affectedObjectsPage,
                    pageSize: AFFECTED_OBJECTS_PAGE_SIZE,
                    totalItemCount: affectedObjects?.total ?? 0,
                    showPerPageOptions: false,
                  }}
                  onChange={({ page }: Criteria<MergeAffectedObject>) =>
                    loadAffectedObjects(page?.index ?? 0)
                  }
                />
              </>
            )}
            <EuiSpacer size="m" />
            {!preview.canStartMerge.allowed && (
              <>
                <EuiCallOut
                  color="danger"
                  title={i18n.translate(
                    'xpack.savedObjectsTagging.management.merge.preview.cannotStart',
                    {
                      defaultMessage: 'You cannot start this merge',
                    }
                  )}
                >
                  <ul>
                    {preview.canStartMerge.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            )}
            <EuiCheckbox
              id="mergeDuplicateTagsDeleteSources"
              data-test-subj="mergeDuplicateTagsDeleteSourcesCheckbox"
              checked={deleteSources}
              disabled={!preview.canRequestDeleteSources.allowed}
              onChange={(e) => setDeleteSources(e.target.checked)}
              label={i18n.translate(
                'xpack.savedObjectsTagging.management.merge.preview.deleteSources',
                {
                  defaultMessage:
                    '{count, plural, one {Delete the duplicate tag} other {Delete the duplicate tags}} once the merge completes',
                  values: { count: fromIds.length },
                }
              )}
            />
            {!preview.canRequestDeleteSources.allowed && (
              <EuiText size="xs" color="subdued">
                {preview.canRequestDeleteSources.reasons.join(' ')}
              </EuiText>
            )}
          </>
        )}
      </>
    );

    footer = (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => setStep('select')}>
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.merge.backButton"
              defaultMessage="Back"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="mergeDuplicateTagsStartButton"
            fill
            disabled={!preview || !preview.canStartMerge.allowed}
            onClick={startMerge}
          >
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.merge.startButton"
              defaultMessage="Start merge"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else if (step === 'running') {
    const percent = status?.progress.percent;
    const jobTagName = runningJobTagName(status?.job);
    body = (
      <>
        {errorCallout}
        {jobTagName && (
          <>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.savedObjectsTagging.management.merge.running.mergingInto"
                  defaultMessage='Merging duplicate tags into "{name}"'
                  values={{ name: jobTagName }}
                />
              </strong>
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiText size="s" color="subdued">
          {phaseLabel(status?.phase ?? 'scanning')}
        </EuiText>
        <EuiSpacer size="s" />
        {percent != null ? (
          <EuiProgress value={percent} max={100} size="m" />
        ) : (
          <EuiProgress size="m" />
        )}
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.savedObjectsTagging.management.merge.running.updatedCount"
            defaultMessage="{updatedCount} of {totalAffected} saved objects updated"
            values={{
              updatedCount: status?.progress.updatedCount ?? 0,
              totalAffected: status?.progress.totalAffected ?? '…',
            }}
          />
        </EuiText>
      </>
    );

    footer = (
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="mergeDuplicateTagsCancelJobButton"
            color="danger"
            onClick={() => setConfirmingCancel(true)}
          >
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.merge.cancelJobButton"
              defaultMessage="Cancel merge"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    const success = status?.status === 'success';
    const canceled = status?.status === 'canceled';
    const jobTagName = runningJobTagName(status?.job);
    const deletion = status?.deletion ?? [];
    const deletedCount = deletion.filter((d) => d.deleted).length;
    const notDeleted = deletion.filter((d) => !d.deleted);
    const title = (defaultMessage: string) =>
      jobTagName
        ? i18n.translate('xpack.savedObjectsTagging.management.merge.done.titleWithTagName', {
            defaultMessage: '{title} — merged into "{name}"',
            values: { title: defaultMessage, name: jobTagName },
          })
        : defaultMessage;
    body = (
      <>
        {errorCallout}
        <EuiCallOut
          data-test-subj="mergeDuplicateTagsResultCallout"
          color={success ? 'success' : canceled ? 'warning' : 'danger'}
          title={
            success
              ? title(
                  i18n.translate('xpack.savedObjectsTagging.management.merge.done.successTitle', {
                    defaultMessage: 'Merge complete',
                  })
                )
              : canceled
              ? title(
                  i18n.translate('xpack.savedObjectsTagging.management.merge.done.canceledTitle', {
                    defaultMessage: 'Merge canceled',
                  })
                )
              : title(
                  i18n.translate('xpack.savedObjectsTagging.management.merge.done.failedTitle', {
                    defaultMessage: 'Merge failed',
                  })
                )
          }
        >
          <FormattedMessage
            id="xpack.savedObjectsTagging.management.merge.done.updatedCount"
            defaultMessage="{updatedCount} saved objects were updated."
            values={{ updatedCount: status?.progress.updatedCount ?? 0 }}
          />
          {status && status.errors.count > 0 && (
            <>
              {' '}
              <FormattedMessage
                id="xpack.savedObjectsTagging.management.merge.done.errorCount"
                defaultMessage="{count, plural, one {1 object} other {# objects}} could not be updated."
                values={{ count: status.errors.count }}
              />
            </>
          )}
          {deletedCount > 0 && (
            <>
              {' '}
              <FormattedMessage
                id="xpack.savedObjectsTagging.management.merge.done.deletedCount"
                defaultMessage="{count, plural, one {1 duplicate tag} other {# duplicate tags}} deleted."
                values={{ count: deletedCount }}
              />
            </>
          )}
        </EuiCallOut>
        {notDeleted.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup direction="column" gutterSize="s">
              {notDeleted.map((d) => {
                const tag = getTagById.get(d.id);
                const reason =
                  d.remainingReferences != null
                    ? i18n.translate(
                        'xpack.savedObjectsTagging.management.merge.done.tagNotDeleted',
                        {
                          defaultMessage:
                            'still referenced by {count, plural, one {1 object} other {# objects}}',
                          values: { count: d.remainingReferences },
                        }
                      )
                    : i18n.translate(
                        'xpack.savedObjectsTagging.management.merge.done.tagDeleteError',
                        {
                          defaultMessage: 'could not be deleted: {error}',
                          values: { error: d.error ?? 'unknown error' },
                        }
                      );
                return (
                  <EuiFlexItem key={d.id}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        {tag ? <TagBadge tag={tag} /> : <EuiText size="s">{d.id}</EuiText>}
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s" color="subdued">
                          {reason}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </>
        )}
      </>
    );

    footer = (
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton data-test-subj="mergeDuplicateTagsCloseButton" fill onClick={handleClose}>
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.merge.closeButton"
              defaultMessage="Close"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlyout
      onClose={handleClose}
      size="s"
      data-test-subj="mergeDuplicateTagsFlyout"
      aria-labelledby="mergeDuplicateTagsFlyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="mergeDuplicateTagsFlyoutTitle">
            <FormattedMessage
              id="xpack.savedObjectsTagging.management.merge.title"
              defaultMessage="Merge duplicate tags"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{body}</EuiFlyoutBody>
      <EuiFlyoutFooter>{footer}</EuiFlyoutFooter>
      {confirmingCancel && (
        <EuiConfirmModal
          title={i18n.translate('xpack.savedObjectsTagging.management.merge.confirmCancel.title', {
            defaultMessage: 'Cancel merge?',
          })}
          onCancel={() => setConfirmingCancel(false)}
          onConfirm={confirmCancel}
          cancelButtonText={i18n.translate(
            'xpack.savedObjectsTagging.management.merge.confirmCancel.cancelButtonText',
            { defaultMessage: 'Keep running' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.savedObjectsTagging.management.merge.confirmCancel.confirmButtonText',
            { defaultMessage: 'Cancel merge' }
          )}
          buttonColor="danger"
        >
          <FormattedMessage
            id="xpack.savedObjectsTagging.management.merge.confirmCancel.text"
            defaultMessage="Objects already updated will keep the new tag. Objects not yet reached will keep their current tags."
          />
        </EuiConfirmModal>
      )}
    </EuiFlyout>
  );
};
