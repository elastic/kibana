/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord, RelatedRecord } from '../../../../common/investigations/types';
import { useInvestigationsNavigation, useRelated, useUnlinkRecord } from '../../hooks';
import { ICONS } from '../../icons';
import { ConfirmModal } from '../shared/confirm_modal';
import { StatusBadge } from '../shared/status_badge';
import { LinkInvestigationModal } from './link_investigation_modal';
import { RelatedFlyout } from './related_flyout';
import { getReasonSummary } from './related_reasons';
import { SideCard } from './side_card';
import * as i18n from './translations';

export interface RelatedCardProps {
  record: InvestigationRecord;
}

/** Investigations that share entities, indicators or alerts with this one. */
export const RelatedCard: React.FC<RelatedCardProps> = ({ record }) => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading, isError } = useRelated(record.id);
  const { goToRecord } = useInvestigationsNavigation();
  const [selected, setSelected] = useState<RelatedRecord | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [unlinking, setUnlinking] = useState<RelatedRecord | null>(null);
  const { mutate: unlink, isLoading: isUnlinking } = useUnlinkRecord(record.id);

  const related = data?.related ?? [];
  const isLinked = (item: RelatedRecord): boolean =>
    item.reasons.some(({ type }) => type === 'linked');
  const linkedIds = related.filter(isLinked).map((item) => item.record.id);

  return (
    <SideCard
      title={i18n.RELATED}
      count={data ? related.length : undefined}
      action={
        <EuiButtonEmpty
          size="xs"
          iconType={ICONS.link}
          onClick={() => setIsLinking(true)}
          data-test-subj="investigationRelatedLink"
        >
          {i18n.LINK_INVESTIGATION}
        </EuiButtonEmpty>
      }
      data-test-subj="investigationRelatedCard"
    >
      {isLoading ? <EuiLoadingSpinner size="m" /> : null}
      {isError ? (
        <EuiCallOut announceOnMount size="s" color="danger" title={i18n.RELATED_ERROR} />
      ) : null}
      {data && related.length === 0 ? (
        <EuiText size="s" color="subdued">
          {i18n.RELATED_NONE}
        </EuiText>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        {related.map((item) => (
          <EuiFlexItem key={item.record.id}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="s"
              onClick={() => setSelected(item)}
              aria-label={i18n.OPEN_DETAILS_FOR(item.record.display_id)}
              data-test-subj="investigationRelatedItem"
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <strong>{item.record.display_id}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <StatusBadge status={item.record.status} owner={item.record.owner} />
                </EuiFlexItem>
                {isLinked(item) ? (
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color="hollow"
                      iconType={ICONS.link}
                      data-test-subj="investigationRelatedLinkedBadge"
                    >
                      {i18n.LINKED_BADGE}
                    </EuiBadge>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
              <EuiText
                size="s"
                css={css`
                  margin-block-start: ${euiTheme.size.xs};
                `}
              >
                <strong>{item.record.title}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {i18n.WHY_SIMILAR(getReasonSummary(item))}
              </EuiText>
              <EuiText
                size="xs"
                color="primary"
                css={css`
                  margin-block-start: ${euiTheme.size.xs};
                `}
              >
                {i18n.VIEW_DETAILS}{' '}
                <EuiIcon type={ICONS.chevronRight} size="s" aria-hidden="true" />
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {selected ? (
        <RelatedFlyout
          related={selected}
          currentDisplayId={record.display_id}
          isLinked={isLinked(selected)}
          onUnlink={() => {
            setUnlinking(selected);
            setSelected(null);
          }}
          onClose={() => setSelected(null)}
          onOpenInvestigation={(recordId) => {
            setSelected(null);
            goToRecord(recordId);
          }}
        />
      ) : null}
      {isLinking ? (
        <LinkInvestigationModal
          record={record}
          linkedIds={linkedIds}
          onClose={() => setIsLinking(false)}
        />
      ) : null}
      {unlinking ? (
        <ConfirmModal
          title={i18n.UNLINK_CONFIRM_TITLE(unlinking.record.display_id)}
          body={i18n.UNLINK_CONFIRM_BODY(record.display_id, unlinking.record.display_id)}
          confirmLabel={i18n.UNLINK}
          destructive
          isLoading={isUnlinking}
          onConfirm={() => unlink(unlinking.record.id, { onSettled: () => setUnlinking(null) })}
          onCancel={() => setUnlinking(null)}
          data-test-subj="investigationUnlinkModal"
        />
      ) : null}
    </SideCard>
  );
};
RelatedCard.displayName = 'RelatedCard';
