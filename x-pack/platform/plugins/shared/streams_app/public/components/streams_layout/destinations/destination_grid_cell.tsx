/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import { DESTINATION_SIGNAL_LABELS, LOCAL_ELASTICSEARCH_LABEL } from './destination_type_config';
import type { ResolvedIndicesStatus } from './state_machines/destinations_state_machine';
import type { DestinationViewModel } from './types';

interface DestinationGridCellProps {
  destination: DestinationViewModel;
  columnId: string;
  targetedIndexCount: number;
  resolvedIndicesStatus: ResolvedIndicesStatus;
}

export const DestinationGridCell = ({
  destination,
  columnId,
  targetedIndexCount,
  resolvedIndicesStatus,
}: DestinationGridCellProps) => {
  switch (columnId) {
    case 'name':
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiText size="s" data-test-subj="streamsDestinationName">
            <strong>{destination.name}</strong>
          </EuiText>
          {destination.signals.map((signal) => (
            <EuiBadge key={signal} color="hollow">
              {DESTINATION_SIGNAL_LABELS[signal]}
            </EuiBadge>
          ))}
        </EuiFlexGroup>
      );
    case 'type':
      return (
        <EuiFlexGroup
          justifyContent="flexEnd"
          alignItems="center"
          gutterSize="none"
          responsive={false}
        >
          <EuiBadge color="hollow">{LOCAL_ELASTICSEARCH_LABEL}</EuiBadge>
        </EuiFlexGroup>
      );
    case 'indices':
      if (resolvedIndicesStatus === 'loading' && targetedIndexCount === 0) {
        return (
          <EuiFlexGroup
            justifyContent="flexEnd"
            alignItems="center"
            gutterSize="none"
            responsive={false}
          >
            <EuiLoadingSpinner size="s" />
          </EuiFlexGroup>
        );
      }
      if (resolvedIndicesStatus === 'unavailable') {
        return (
          <EuiFlexGroup
            justifyContent="flexEnd"
            alignItems="center"
            gutterSize="none"
            responsive={false}
          >
            <span>-</span>
          </EuiFlexGroup>
        );
      }
      return (
        <EuiFlexGroup
          justifyContent="flexEnd"
          alignItems="center"
          gutterSize="none"
          responsive={false}
        >
          <EuiBadge
            color="hollow"
            data-test-subj="streamsDestinationIndexCountBadge"
            aria-label={i18n.translate(
              'xpack.streams.destinations.table.indexCountBadgeAriaLabel',
              {
                defaultMessage: '{indexCount, plural, one {# index} other {# indices}}',
                values: { indexCount: targetedIndexCount },
              }
            )}
          >
            {targetedIndexCount}
          </EuiBadge>
        </EuiFlexGroup>
      );
    default:
      return null;
  }
};

export const getDestinationSortableValue = (
  destination: DestinationViewModel,
  columnId: string,
  indexCount = 0
): string | number => {
  switch (columnId) {
    case 'type':
      return LOCAL_ELASTICSEARCH_LABEL;
    case 'indices':
      return indexCount;
    case 'name':
    default:
      return destination.name;
  }
};

export const getTargetedIndexCount = (
  resolvedIndicesByDestination: Record<string, ResolvedDestinationIndex[]>,
  destinationId: string
): number => resolvedIndicesByDestination[destinationId]?.length ?? 0;
