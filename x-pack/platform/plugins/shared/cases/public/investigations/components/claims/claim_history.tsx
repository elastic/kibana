/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useActivity } from '../../hooks';
import { ActorAvatar, getActorTypeLine } from '../shared/actor_badge';
import { RelativeTime } from '../shared/relative_time';
import * as i18n from './translations';

export interface ClaimHistoryProps {
  recordId: string;
  claimId: string;
}

const HISTORY_PAGE_SIZE = 50;

/** Every change to the claim, newest first, from the activity log. */
export const ClaimHistory: React.FC<ClaimHistoryProps> = ({ recordId, claimId }) => {
  const { data, isLoading, isError } = useActivity(recordId, {
    target_id: claimId,
    sort_order: 'desc',
    per_page: HISTORY_PAGE_SIZE,
  });

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }
  if (isError) {
    return <EuiCallOut announceOnMount size="s" color="danger" title={i18n.HISTORY_ERROR} />;
  }
  const entries = data?.entries ?? [];
  if (entries.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationClaimHistoryEmpty">
        {i18n.NO_HISTORY}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="investigationClaimHistory">
      {entries.map((entry) => {
        const typeLine = getActorTypeLine(entry.actor);
        return (
          <EuiFlexItem key={entry.id}>
            <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <ActorAvatar actor={entry.actor} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{entry.actor.name}</strong>
                  {typeLine ? (
                    <EuiText component="span" size="xs" color="subdued">
                      {' '}
                      {typeLine}
                    </EuiText>
                  ) : null}
                  <EuiText component="span" size="xs" color="subdued">
                    {' · '}
                    <RelativeTime value={entry.ts} />
                  </EuiText>
                </EuiText>
                <EuiText size="s">{entry.message}</EuiText>
                {entry.details ? (
                  <EuiText size="xs" color="subdued">
                    {entry.details}
                  </EuiText>
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
ClaimHistory.displayName = 'ClaimHistory';
