/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FeatureHistoryEntry } from '@kbn/streams-schema';
import React, { useMemo, useState } from 'react';
import { JsonDiffView } from './json_diff_view';
import { InfoPanel } from '../../../info_panel';
import { useFeatureHistory } from '../../../../hooks/sig_events/use_feature_history';

interface Props {
  streamName: string;
  featureId: string;
}

export function FeatureHistoryPanel({ streamName, featureId }: Props) {
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  // Raw index into entries[] (DESC order). null = modal closed.
  const [inspectedIndex, setInspectedIndex] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useFeatureHistory({
    streamName,
    featureId,
    enabled: hasBeenOpened,
  });

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);

  // Indices of non-deleted entries in DESC order (index 0 = newest).
  // Deleted tombstones are milestones, not inspectable revisions.
  const nonDeletedIndices = useMemo(
    () =>
      entries
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.change_type !== 'deleted')
        .map(({ i }) => i),
    [entries]
  );

  // Revision number for each non-deleted entry: oldest = 1, newest = N.
  const revisionByIndex = useMemo(() => {
    const map = new Map<number, number>();
    nonDeletedIndices.forEach((rawIdx, j) => {
      map.set(rawIdx, nonDeletedIndices.length - j);
    });
    return map;
  }, [nonDeletedIndices]);

  const inspectedEntry = inspectedIndex !== null ? entries[inspectedIndex] : null;
  const inspectedRevision =
    inspectedIndex !== null ? revisionByIndex.get(inspectedIndex) ?? null : null;
  const inspectedNonDeletedPos =
    inspectedIndex !== null ? nonDeletedIndices.indexOf(inspectedIndex) : -1;

  const hasPrevious = inspectedNonDeletedPos < nonDeletedIndices.length - 1;
  const previousEntry = hasPrevious ? entries[nonDeletedIndices[inspectedNonDeletedPos + 1]] : null;
  const previousRevision =
    previousEntry !== null && inspectedNonDeletedPos + 1 < nonDeletedIndices.length
      ? revisionByIndex.get(nonDeletedIndices[inspectedNonDeletedPos + 1]) ?? null
      : null;

  return (
    <>
      <InfoPanel title={HISTORY_LABEL}>
        <EuiAccordion
          id={`feature-history-accordion-${featureId}`}
          buttonContent={VIEW_HISTORY_LABEL}
          initialIsOpen={false}
          onToggle={(isOpen) => {
            if (isOpen) setHasBeenOpened(true);
          }}
        >
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            css={{ marginTop: '8px', paddingBottom: '4px' }}
          >
            {isLoading && (
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="s" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">{LOADING_LABEL}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {error && (
              <EuiFlexItem>
                <EuiCallOut announceOnMount title={ERROR_LABEL} color="danger" iconType="alert">
                  <EuiText size="s">{error.message}</EuiText>
                  <EuiButton size="s" color="danger" onClick={() => refetch()}>
                    {RETRY_LABEL}
                  </EuiButton>
                </EuiCallOut>
              </EuiFlexItem>
            )}
            {!isLoading && !error && entries.length === 0 && hasBeenOpened && (
              <EuiFlexItem>
                <EuiText size="s">{NO_HISTORY_LABEL}</EuiText>
              </EuiFlexItem>
            )}
            {!isLoading && !error && entries.length > 0 && (
              <>
                {entries.map((entry, i) => {
                  const revision = revisionByIndex.get(i);
                  // "current" = first non-deleted entry AND no newer entry exists
                  const isCurrent = i === nonDeletedIndices[0] && nonDeletedIndices[0] === 0;
                  return (
                    <EuiFlexItem key={entry['@timestamp']}>
                      <FeatureHistoryRow
                        entry={entry}
                        revision={revision}
                        isCurrent={isCurrent}
                        onInspect={
                          entry.change_type !== 'deleted' ? () => setInspectedIndex(i) : undefined
                        }
                      />
                    </EuiFlexItem>
                  );
                })}
              </>
            )}
          </EuiFlexGroup>
        </EuiAccordion>
      </InfoPanel>

      {inspectedEntry && inspectedIndex !== null && inspectedRevision !== null && (
        <EuiModal
          onClose={() => setInspectedIndex(null)}
          style={{ width: hasPrevious ? 960 : 600 }}
          aria-label={i18n.translate(
            'xpack.streams.featureDetailsFlyout.history.snapshotModalLabel',
            { defaultMessage: 'Feature revision snapshot' }
          )}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {hasPrevious && previousRevision !== null
                ? i18n.translate('xpack.streams.featureDetailsFlyout.history.diffTitle', {
                    defaultMessage: 'Revision {n} — diff from Revision {prev}',
                    values: { n: inspectedRevision, prev: previousRevision },
                  })
                : i18n.translate('xpack.streams.featureDetailsFlyout.history.snapshotTitle', {
                    defaultMessage: 'Revision {n} of {total}',
                    values: { n: inspectedRevision, total: nonDeletedIndices.length },
                  })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {hasPrevious && previousEntry ? (
              <div style={{ overflowY: 'auto', maxHeight: 500 }}>
                <JsonDiffView
                  oldSource={JSON.stringify(previousEntry.snapshot, null, 2)}
                  newSource={JSON.stringify(inspectedEntry.snapshot, null, 2)}
                />
              </div>
            ) : (
              <EuiCodeBlock
                language="json"
                paddingSize="s"
                fontSize="s"
                isCopyable
                overflowHeight={400}
              >
                {JSON.stringify(inspectedEntry.snapshot, null, 2)}
              </EuiCodeBlock>
            )}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowLeft"
                  aria-label={OLDER_LABEL}
                  title={OLDER_LABEL}
                  disabled={inspectedNonDeletedPos >= nonDeletedIndices.length - 1}
                  onClick={() => setInspectedIndex(nonDeletedIndices[inspectedNonDeletedPos + 1])}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.streams.featureDetailsFlyout.history.revisionCounter', {
                    defaultMessage: 'Revision {n} of {total}',
                    values: { n: inspectedRevision, total: nonDeletedIndices.length },
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowRight"
                  aria-label={NEWER_LABEL}
                  title={NEWER_LABEL}
                  disabled={inspectedNonDeletedPos <= 0}
                  onClick={() => setInspectedIndex(nonDeletedIndices[inspectedNonDeletedPos - 1])}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
}

interface RowProps {
  entry: FeatureHistoryEntry;
  revision: number | undefined;
  isCurrent: boolean;
  onInspect: (() => void) | undefined;
}

function FeatureHistoryRow({ entry, revision, isCurrent, onInspect }: RowProps) {
  const badgeColor =
    entry.change_type === 'new'
      ? 'success'
      : entry.change_type === 'updated'
      ? 'warning'
      : 'danger';

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color={badgeColor}>{entry.change_type}</EuiBadge>
      </EuiFlexItem>
      {isCurrent && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{CURRENT_LABEL}</EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiText size="s">{new Date(entry['@timestamp']).toLocaleString()}</EuiText>
      </EuiFlexItem>
      {onInspect && revision !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={onInspect} flush="right">
            {i18n.translate('xpack.streams.featureDetailsFlyout.history.revisionLabel', {
              defaultMessage: 'Revision {n}',
              values: { n: revision },
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

const HISTORY_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.history.title', {
  defaultMessage: 'History',
});

const VIEW_HISTORY_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.history.viewHistory',
  {
    defaultMessage: 'View revision history',
  }
);

const LOADING_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.history.loading', {
  defaultMessage: 'Loading history…',
});

const ERROR_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.history.error', {
  defaultMessage: 'Failed to load history',
});

const RETRY_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.history.retry', {
  defaultMessage: 'Retry',
});

const NO_HISTORY_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.history.empty', {
  defaultMessage: 'No history available',
});

const CURRENT_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.history.current', {
  defaultMessage: 'current',
});

const OLDER_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.history.older', {
  defaultMessage: 'Older revision',
});

const NEWER_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.history.newer', {
  defaultMessage: 'Newer revision',
});
