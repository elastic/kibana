/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../../common/types';

export const NOT_FOUND_BADGE_LABEL = i18n.translate('xpack.boost.notFoundBadge.label', {
  defaultMessage: 'Not found',
});

/** Why a rule's picked targets are marked, and that the rule keeps them. */
export const getNotFoundDescription = (
  names: readonly string[],
  type: BoostProfileType | undefined
): string => {
  const [name] = names;
  if (names.length > 1) {
    return type === 'data_streams'
      ? i18n.translate('xpack.boost.notFoundBadge.dataStreamsDescription', {
          defaultMessage:
            "No data streams named {names} exist. This rule applies to them if they're created again.",
          values: { names: names.map((missing) => `"${missing}"`).join(', ') },
        })
      : i18n.translate('xpack.boost.notFoundBadge.indicesDescription', {
          defaultMessage:
            "No indices named {names} exist. This rule applies to them if they're created again.",
          values: { names: names.map((missing) => `"${missing}"`).join(', ') },
        });
  }
  return type === 'data_streams'
    ? i18n.translate('xpack.boost.notFoundBadge.dataStreamDescription', {
        defaultMessage:
          'No data stream named "{name}" exists. This rule applies to it if it\'s created again.',
        values: { name },
      })
    : i18n.translate('xpack.boost.notFoundBadge.indexDescription', {
        defaultMessage:
          'No index named "{name}" exists. This rule applies to it if it\'s created again.',
        values: { name },
      });
};

interface NotFoundBadgeProps {
  /** The rule's picked targets that don't exist. */
  names: readonly string[];
  type: BoostProfileType | undefined;
  /**
   * Explains the badge in a tooltip. Without one, such as inside a list option, which can't hold
   * focusable content and shows the explanation in its own tooltip, the badge is just its label.
   */
  hasTooltip?: boolean;
}

/**
 * Marks a rule's picked target that no longer exists. The rule keeps it, as Elasticsearch does, so
 * it applies again to an index or data stream created with that name.
 */
export const NotFoundBadge = ({ names, type, hasTooltip = true }: NotFoundBadgeProps) => {
  const badge = (
    <EuiBadge
      color="warning"
      iconType="warning"
      // Focusable, so keyboard users can open the tooltip.
      tabIndex={hasTooltip ? 0 : undefined}
      data-test-subj="boostNotFoundBadge"
    >
      {NOT_FOUND_BADGE_LABEL}
    </EuiBadge>
  );
  return hasTooltip ? (
    <EuiToolTip content={getNotFoundDescription(names, type)}>{badge}</EuiToolTip>
  ) : (
    badge
  );
};
