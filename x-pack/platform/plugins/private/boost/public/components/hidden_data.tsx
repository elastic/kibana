/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../../common/types';
import { HIDDEN_BADGE_LABEL } from './badge_labels';

/**
 * Includes hidden indices or data streams in a list, which leaves them out until then. Boost rules
 * apply to them all the same, so counts of what rules apply to include them either way.
 */
export const SHOW_HIDDEN_LABEL = i18n.translate('xpack.boost.hiddenData.showHidden', {
  defaultMessage: 'Show hidden',
});

/** Marks a hidden index or data stream. */
export const HiddenBadge = () => (
  <EuiBadge data-test-subj="boostHiddenBadge">{HIDDEN_BADGE_LABEL}</EuiBadge>
);

/** How many hidden indices or data streams a list leaves out, such as "3 hidden indices not shown". */
export const formatHiddenNotShown = (type: BoostProfileType | undefined, count: number): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.boost.hiddenData.dataStreamsNotShown', {
        defaultMessage:
          '{count, plural, one {# hidden data stream} other {# hidden data streams}} not shown',
        values: { count },
      })
    : i18n.translate('xpack.boost.hiddenData.indicesNotShown', {
        defaultMessage: '{count, plural, one {# hidden index} other {# hidden indices}} not shown',
        values: { count },
      });

interface ShowHiddenSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'data-test-subj'?: string;
}

/** Whether a list shows hidden indices or data streams. */
export const ShowHiddenSwitch = ({
  checked,
  onChange,
  disabled = false,
  'data-test-subj': dataTestSubj,
}: ShowHiddenSwitchProps) => (
  <EuiSwitch
    compressed
    label={SHOW_HIDDEN_LABEL}
    checked={checked}
    disabled={disabled}
    onChange={(event) => onChange(event.target.checked)}
    data-test-subj={dataTestSubj}
  />
);
