/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatSeriesLabel } from '../../../utils/format_series_label';

export interface ActiveGroupChipProps {
  groupHash: string;
  groupingValues?: Record<string, string | null> | null;
  onClear: () => void;
}

export const ActiveGroupChip: React.FC<ActiveGroupChipProps> = ({
  groupHash,
  groupingValues,
  onClear,
}) => {
  const valueLabel = useMemo(
    () => formatSeriesLabel(groupHash, groupingValues),
    [groupHash, groupingValues]
  );

  const fullHashTitle = i18n.translate(
    'xpack.alertingV2.alertEpisodesList.activeGroupChip.fullHashTitle',
    {
      defaultMessage: 'Alert series - {hash}',
      values: { hash: groupHash },
    }
  );

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj="episodesActiveGroupChip"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.alertingV2.alertEpisodesList.activeGroupChip.label', {
            defaultMessage: 'Filtered by:',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge
          color="hollow"
          iconType="cross"
          iconSide="right"
          iconOnClick={onClear}
          iconOnClickAriaLabel={i18n.translate(
            'xpack.alertingV2.alertEpisodesList.activeGroupChip.clearAriaLabel',
            { defaultMessage: 'Clear group filter' }
          )}
          title={fullHashTitle}
          data-test-subj="episodesActiveGroupChipBadge"
        >
          {valueLabel}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
