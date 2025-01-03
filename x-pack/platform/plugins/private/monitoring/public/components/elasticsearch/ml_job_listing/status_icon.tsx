/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { StatusIcon, STATUS_ICON_TYPES } from '../../status_icon';

export function MachineLearningJobStatusIcon({ status }: { status: string }) {
  const type = (() => {
    const statusKey = status.toUpperCase();

    if (statusKey === 'OPENED') {
      return STATUS_ICON_TYPES.GREEN;
    } else if (statusKey === 'CLOSED') {
      return STATUS_ICON_TYPES.GRAY;
    } else if (statusKey === 'FAILED') {
      return STATUS_ICON_TYPES.RED;
    }

    // basically a "changing" state like OPENING or CLOSING
    return STATUS_ICON_TYPES.YELLOW;
  })();

  return (
    <StatusIcon
      type={type}
      label={i18n.translate('xpack.monitoring.elasticsearch.mlJobListing.statusIconLabel', {
        defaultMessage: 'Job Status: {status}',
        values: { status },
      })}
    />
  );
}
