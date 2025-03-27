/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

interface ManagedBadgeProps {
  meta?: {
    managed?: boolean;
  };
}

export const ManagedBadge: React.FC<ManagedBadgeProps> = ({ meta }) => {
  const theme = useEuiTheme();
  if (!meta?.managed) return null;

  return (
    <EuiBadge
      color="hollow"
      className={css`
        margin-left: ${theme.euiTheme.size.s};
      `}
    >
      {i18n.translate('xpack.streams.streamDetailView.managed', {
        defaultMessage: 'Managed',
      })}
    </EuiBadge>
  );
};
