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

const INCLUDE_HIDDEN_LABELS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.boost.hiddenData.includeHiddenIndices', {
    defaultMessage: 'Include hidden indices',
  }),
  data_streams: i18n.translate('xpack.boost.hiddenData.includeHiddenDataStreams', {
    defaultMessage: 'Include hidden data streams',
  }),
};

/** Marks a hidden index or data stream, as Index Management does. */
export const HiddenBadge = () => (
  <EuiBadge color="hollow" data-test-subj="boostHiddenBadge">
    {HIDDEN_BADGE_LABEL}
  </EuiBadge>
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

interface IncludeHiddenSwitchProps {
  type: BoostProfileType;
  checked: boolean;
  onChange: (checked: boolean) => void;
  'data-test-subj'?: string;
}

/**
 * Whether a list includes hidden indices or data streams, which it leaves out until asked, as Index
 * Management does. Boost rules apply to them all the same, so counts of what rules apply to include
 * them either way.
 */
export const IncludeHiddenSwitch = ({
  type,
  checked,
  onChange,
  'data-test-subj': dataTestSubj = 'boostIncludeHidden',
}: IncludeHiddenSwitchProps) => (
  <EuiSwitch
    compressed
    label={INCLUDE_HIDDEN_LABELS[type]}
    checked={checked}
    onChange={(event) => onChange(event.target.checked)}
    data-test-subj={dataTestSubj}
  />
);
