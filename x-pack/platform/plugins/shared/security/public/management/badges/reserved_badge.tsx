/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiToolTipProps } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';

import { OptionalToolTip } from './optional_tooltip';

export const reservedBadgeLabel = i18n.translate('xpack.security.management.reservedBadge', {
  defaultMessage: 'Reserved',
});

interface Props {
  'data-test-subj'?: string;
  tooltipContent?: EuiToolTipProps['content'];
}

export const ReservedBadge = (props: Props) => {
  return (
    <OptionalToolTip tooltipContent={props.tooltipContent}>
      <EuiBadge data-test-subj={props['data-test-subj']} color="primary">
        {reservedBadgeLabel}
      </EuiBadge>
    </OptionalToolTip>
  );
};
