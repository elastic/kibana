/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
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
import { useInvestigationsNavigation, useRelated } from '../../hooks';
import { ICONS } from '../../icons';
import { StatusBadge } from '../shared/status_badge';
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

  const related = data?.related ?? [];

  return (
    <SideCard
      title={i18n.RELATED}
      count={data ? related.length : undefined}
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
          onClose={() => setSelected(null)}
          onOpenInvestigation={(recordId) => {
            setSelected(null);
            goToRecord(recordId);
          }}
        />
      ) : null}
    </SideCard>
  );
};
RelatedCard.displayName = 'RelatedCard';
