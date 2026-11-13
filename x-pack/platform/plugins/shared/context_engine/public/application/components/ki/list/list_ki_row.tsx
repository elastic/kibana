/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import type { KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import { resolveKiStatus } from '../../../utils/ki_expiry';
import { KiFormattedDate } from '../shared/ki_formatted_date';
import { KiLifecycleStatusBadge } from '../shared/ki_lifecycle_status_badge';
import { KiTypeDisplay } from '../shared/ki_type_display';
import { getKiDisplayTitle } from './list_ki_helpers';
import { useListKiGroupsStyles } from './list_ki_groups_styles';

interface ListKiRowProps {
  ki: KiListItem;
  isSelected: boolean;
  onSelect: (ki: KiListItem) => void;
  onHover: (ki: KiListItem) => void;
}

export const ListKiRow = ({ ki, isSelected, onSelect, onHover }: ListKiRowProps) => {
  const styles = useListKiGroupsStyles();
  const {
    title,
    type,
    lifecycle_status: lifecycleStatus,
    expires_at: expiresAt,
    updated_at: updatedAt,
  } = ki;
  const status = resolveKiStatus(lifecycleStatus, expiresAt);

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      css={[styles.row, isSelected && styles.selectedRow]}
      onClick={() => onSelect(ki)}
      onMouseEnter={() => onHover(ki)}
      onFocus={() => onHover(ki)}
      data-test-subj="contextKiRow"
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
        action: CONTEXT_ENGINE_UI_EBT.action.listKi.OPEN_ROW,
      })}
    >
      <span
        css={[styles.rowTitle, status === 'deleted' && styles.deletedRowTitle]}
        data-test-subj="contextKiRowTitle"
      >
        {getKiDisplayTitle(title)}
      </span>
      <span css={styles.rowMeta}>
        <KiTypeDisplay as="badge" type={type} data-test-subj="contextKiRowType" />
        {status !== 'active' ? (
          <KiLifecycleStatusBadge lifecycleStatus={lifecycleStatus} expiresAt={expiresAt} />
        ) : null}
        {updatedAt ? (
          <span css={styles.rowUpdated} data-test-subj="contextKiRowUpdatedAt">
            <KiFormattedDate value={updatedAt} />
          </span>
        ) : null}
      </span>
    </button>
  );
};
