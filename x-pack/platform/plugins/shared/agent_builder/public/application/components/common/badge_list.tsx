/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBadgeGroup, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface BadgeListProps {
  items: string[];
  /** How many to show before the rest collapse into a single count badge. */
  numVisible?: number;
  ariaLabel: string;
  /** Prefixes each badge's `data-test-subj`, as `<prefix>-<item>`; the count badge is `<prefix>HiddenCount`. */
  testSubjPrefix: string;
  'data-test-subj'?: string;
}

const NUM_VISIBLE_BADGES = 4;

/**
 * A row of hollow badges that collapses its overflow into a `+N` badge, so a table row stays one
 * line tall however many items it carries. The hidden ones are named in the count badge's tooltip.
 */
export const BadgeList: React.FC<BadgeListProps> = ({
  items,
  numVisible = NUM_VISIBLE_BADGES,
  ariaLabel,
  testSubjPrefix,
  'data-test-subj': dataTestSubj,
}) => {
  if (items.length === 0) {
    return null;
  }

  const visible = items.slice(0, numVisible);
  const hidden = items.slice(numVisible);

  return (
    <EuiBadgeGroup gutterSize="s" role="list" aria-label={ariaLabel} data-test-subj={dataTestSubj}>
      {visible.map((item) => (
        <EuiBadge
          key={item}
          color="hollow"
          role="listitem"
          data-test-subj={`${testSubjPrefix}-${item}`}
        >
          {item}
        </EuiBadge>
      ))}
      {hidden.length > 0 && (
        <EuiToolTip content={hidden.join(', ')}>
          {/* Focusable so the overflow is reachable without a pointer; the badge itself does nothing. */}
          <EuiBadge
            color="hollow"
            tabIndex={0}
            aria-label={i18n.translate('xpack.agentBuilder.badgeList.hiddenCountAriaLabel', {
              defaultMessage: '{count} more: {items}',
              values: { count: hidden.length, items: hidden.join(', ') },
            })}
            data-test-subj={`${testSubjPrefix}HiddenCount`}
          >
            {i18n.translate('xpack.agentBuilder.badgeList.hiddenCount', {
              defaultMessage: '+{count}',
              values: { count: hidden.length },
            })}
          </EuiBadge>
        </EuiToolTip>
      )}
    </EuiBadgeGroup>
  );
};
