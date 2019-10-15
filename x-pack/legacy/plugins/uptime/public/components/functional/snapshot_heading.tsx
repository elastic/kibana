/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  down: number;
  total: number;
}

export const SnapshotHeading = ({ down, total }: Props) => (
  <EuiTitle size="s">
    <h2>
      {down === 0
        ? i18n.translate('xpack.uptime.snapshot.zeroDownMessage', {
            defaultMessage: 'All monitors are up',
          })
        : i18n.translate('xpack.uptime.snapshot.downCountsMessage', {
            defaultMessage: '{down}/{total} monitors are down',
            values: {
              down,
              total,
            },
          })}
    </h2>
  </EuiTitle>
);
