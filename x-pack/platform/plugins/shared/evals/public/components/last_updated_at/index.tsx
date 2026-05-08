/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

const UPDATED_PREFIX = i18n.translate('xpack.evals.lastUpdatedAt.prefix', {
  defaultMessage: 'Updated',
});

const UPDATING_TEXT = i18n.translate('xpack.evals.lastUpdatedAt.updating', {
  defaultMessage: 'Updating...',
});

interface LastUpdatedAtProps {
  updatedAt: number;
  isUpdating?: boolean;
}

export const LastUpdatedAt: React.FC<LastUpdatedAtProps> = React.memo(
  ({ updatedAt, isUpdating = false }) => {
    const [, setTick] = useState(0);

    useEffect(() => {
      const timer = setInterval(() => setTick((t) => t + 1), 10000);
      return () => clearInterval(timer);
    }, []);

    if (isUpdating) {
      return (
        <EuiText color="subdued" size="xs">
          {UPDATING_TEXT}
        </EuiText>
      );
    }

    if (!updatedAt) {
      return null;
    }

    const content = (
      <>
        {`${UPDATED_PREFIX} `}
        <FormattedRelative value={new Date(updatedAt)} />
      </>
    );

    return (
      <EuiToolTip content={content}>
        <EuiText color="subdued" size="xs" data-test-subj="lastUpdatedAt" tabIndex={0}>
          {content}
        </EuiText>
      </EuiToolTip>
    );
  }
);

LastUpdatedAt.displayName = 'LastUpdatedAt';
