/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';

interface ManagedBadgeProps {
  meta?: {
    managed?: boolean;
  };
}

export const ManagedBadge: React.FC<ManagedBadgeProps> = ({ meta }) => {
  if (!meta?.managed) return null;

  return (
    <>
      {' '}
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.streamDetailView.managed', {
          defaultMessage: 'Managed',
        })}
      </EuiBadge>
    </>
  );
};
