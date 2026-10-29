/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import { getSignalTargetsWritePatterns } from '@kbn/streams-schema';
import { IngestRateChartContent } from '../../stream_detail_overview/ingest_rate_chart';
import { DeferredMount } from '../deferred_mount';
import { DeleteDestinationConfirmation } from './delete_destination_confirmation';
import { getReadableFailureStoreNames } from './destination_index_stats';
import { DestinationIndicesTable } from './destination_indices_table';
import { useDestinationIndexStats } from './destinations_context';
import { S3DestinationDetails } from './s3_destination_details';
import type { DestinationDetailActorRef } from './state_machines/destination_detail_state_machine';
import type { ResolvedIndicesStatus } from './state_machines/destinations_state_machine';
import type { DestinationViewModel } from './types';

const UNIT_DESTINATION_FLYOUT_MAX_WIDTH = 1125;

const DestinationDeleteFooter = ({
  destinationName,
  onDelete,
  isDisabled = false,
}: {
  destinationName: string;
  onDelete: () => void;
  isDisabled?: boolean;
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <>
      <EuiButton
        color="danger"
        isDisabled={isDisabled}
        onClick={() => setIsConfirmingDelete(true)}
        data-test-subj="streamsDeleteDestinationButton"
      >
        <FormattedMessage
          id="xpack.streams.destinations.deleteDestinationButtonLabel"
          defaultMessage="Delete destination"
        />
      </EuiButton>
      {isConfirmingDelete && (
        <DeleteDestinationConfirmation
          destinationName={destinationName}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={() => {
            onDelete();
            setIsConfirmingDelete(false);
          }}
        />
      )}
    </>
  );
};

/** Stats only cover data streams, so a total over regular indices too is unknown. */
const sumStat = (
  indices: readonly ResolvedDestinationIndex[],
  values: Record<string, number> | undefined
): number | undefined =>
  values && indices.every(({ is_data_stream: isDataStream }) => isDataStream)
    ? indices.reduce((total, { name }) => total + (values[name] ?? 0), 0)
    : undefined;

export const UnitDestinationFlyout = ({
  destination,
  indices,
  indicesStatus,
  indicesError,
  destinationDetailRef,
  onShowDestinationDetail,
  onHideDestinationDetail,
  onClose,
  onDelete,
  onIndexClick,
  isDeleteDisabled = false,
}: {
  destination: DestinationViewModel;
  indices: ResolvedDestinationIndex[];
  indicesStatus: ResolvedIndicesStatus;
  indicesError?: string;
  destinationDetailRef?: DestinationDetailActorRef;
  onShowDestinationDetail: (destinationId: string, viewerId: string) => void;
  onHideDestinationDetail: (destinationId: string, viewerId: string) => void;
  onClose: () => void;
  onDelete: () => void;
  onIndexClick: (indexName: string) => void;
  isDeleteDisabled?: boolean;
}) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'streamsUnitDestinationFlyoutTitle' });

  const { stats: indexStats, status: indexStatsStatus } =
    useDestinationIndexStats(destinationDetailRef);
  const esqlSource = useMemo(() => {
    if (destination.type !== 'elasticsearch') {
      return undefined;
    }
    // ES|QL fails on a concrete index that doesn't exist yet, so only resolved names are queried.
    const resolvedNames = new Set(indices.map(({ name }) => name));
    const patterns = getSignalTargetsWritePatterns(destination).filter(
      (pattern) => pattern.includes('*') || resolvedNames.has(pattern)
    );
    if (patterns.length === 0) {
      return undefined;
    }
    // Selected per data stream: `::failures` on a regular index or unreadable stream fails the query.
    const failureStores = getReadableFailureStoreNames(indices).map((name) => `${name}::failures`);
    return [...patterns, ...failureStores].join(',');
  }, [destination, indices]);

  const totals = useMemo(
    () => ({
      docs: sumStat(indices, indexStats?.docs),
      storageBytes: sumStat(indices, indexStats?.storageBytes),
      loading: indexStatsStatus === 'loading',
      storageError:
        indexStatsStatus === 'failed' ||
        (indexStatsStatus === 'ready' && indexStats?.storageBytes === undefined),
    }),
    [indexStats, indexStatsStatus, indices]
  );

  return (
    <EuiFlyout
      ownFocus
      aria-labelledby={flyoutTitleId}
      onClose={onClose}
      size="l"
      maxWidth={UNIT_DESTINATION_FLYOUT_MAX_WIDTH}
      data-test-subj="streamsUnitDestinationFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{destination.name}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {destination.type === 'elasticsearch' && indicesStatus === 'ready' && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" data-test-subj="streamsUnitDestinationIndexCount">
                <FormattedMessage
                  id="xpack.streams.destinations.indices.countTitle"
                  defaultMessage="{count, plural, one {# index} other {# indices}}"
                  values={{ count: indices.length }}
                />
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {destination.description && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>{destination.description}</p>
            </EuiText>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {destination.type === 's3' ? (
          <S3DestinationDetails destination={destination} />
        ) : (
          <DeferredMount>
            {esqlSource && (
              <>
                <IngestRateChartContent
                  streamName={destination.id}
                  esqlSource={esqlSource}
                  canReadFailureStore={false}
                  isQueryStream={false}
                  isDraft={false}
                  totals={totals}
                />
                <EuiSpacer size="l" />
              </>
            )}
            <DestinationIndicesTable
              destinationId={destination.id}
              indices={indices}
              indicesStatus={indicesStatus}
              indicesError={indicesError}
              destinationDetailRef={destinationDetailRef}
              onShowDestinationDetail={onShowDestinationDetail}
              onHideDestinationDetail={onHideDestinationDetail}
              onIndexClick={onIndexClick}
              showToolbar
            />
          </DeferredMount>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <DestinationDeleteFooter
          destinationName={destination.name}
          isDisabled={isDeleteDisabled}
          onDelete={onDelete}
        />
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
