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

const getMessage = (down: number, total: number): string => {
  if (down === 0 && total > 0) {
    return i18n.translate('xpack.uptime.snapshot.zeroDownMessage', {
      defaultMessage: 'All monitors are up',
    });
  } else if (down === 0 && total === 0) {
    return i18n.translate('xpack.uptime.snapshot.noMonitorMessage', {
      defaultMessage: 'No monitors found',
    });
  }
  return i18n.translate('xpack.uptime.snapshot.downCountsMessage', {
    defaultMessage: '{down}/{total} monitors are down',
    values: {
      down,
      total,
    },
  });
};

export const SnapshotHeading = ({ down, total }: Props) => (
  <EuiTitle size="s">
    <h2>{getMessage(down, total)}</h2>
  </EuiTitle>
);
