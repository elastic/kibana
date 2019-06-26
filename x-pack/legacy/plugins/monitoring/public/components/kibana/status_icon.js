/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatusIcon } from 'plugins/monitoring/components/status_icon';
import { i18n } from '@kbn/i18n';

export function KibanaStatusIcon({ status, availability = true }) {
  const type = (() => {
    if (!availability) {
      return StatusIcon.TYPES.GRAY;
    }

    const statusKey = status.toUpperCase();
    return StatusIcon.TYPES[statusKey] || StatusIcon.TYPES.YELLOW;
  })();

  return (
    <StatusIcon
      type={type}
      label={i18n.translate('xpack.monitoring.kibana.statusIconLabel', {
        defaultMessage: 'Health: {status}',
        values: {
          status
        }
      })}
    />
  );
}
