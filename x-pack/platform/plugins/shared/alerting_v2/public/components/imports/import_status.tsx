/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ImportStatus } from '@kbn/alerting-v2-schemas';

interface ImportStatusMeta {
  label: string;
  color: 'success' | 'subdued' | 'warning' | 'danger';
  description: string;
}

/** POC: how each server-derived import status is shown. */
export const IMPORT_STATUS_META: Record<ImportStatus, ImportStatusMeta> = {
  receiving: {
    label: i18n.translate('xpack.alertingV2.imports.status.receiving', {
      defaultMessage: 'Receiving',
    }),
    color: 'success',
    description: i18n.translate('xpack.alertingV2.imports.status.receivingDescription', {
      defaultMessage: 'An alert arrived in the last 24 hours.',
    }),
  },
  waiting: {
    label: i18n.translate('xpack.alertingV2.imports.status.waiting', {
      defaultMessage: 'Waiting for first alert',
    }),
    color: 'subdued',
    description: i18n.translate('xpack.alertingV2.imports.status.waitingDescription', {
      defaultMessage: 'Nothing has been received yet.',
    }),
  },
  idle: {
    label: i18n.translate('xpack.alertingV2.imports.status.idle', { defaultMessage: 'Idle' }),
    color: 'warning',
    description: i18n.translate('xpack.alertingV2.imports.status.idleDescription', {
      defaultMessage: 'No alert arrived in the last 24 hours.',
    }),
  },
  failing: {
    label: i18n.translate('xpack.alertingV2.imports.status.failing', {
      defaultMessage: 'Failing',
    }),
    color: 'danger',
    description: i18n.translate('xpack.alertingV2.imports.status.failingDescription', {
      defaultMessage: 'The latest run of the import workflow failed.',
    }),
  },
  disabled: {
    label: i18n.translate('xpack.alertingV2.imports.status.disabled', {
      defaultMessage: 'Disabled',
    }),
    color: 'subdued',
    description: i18n.translate('xpack.alertingV2.imports.status.disabledDescription', {
      defaultMessage:
        'The import does not accept alerts. It was switched off, or its connector has Receive events turned off.',
    }),
  },
  connector_missing: {
    label: i18n.translate('xpack.alertingV2.imports.status.connectorMissing', {
      defaultMessage: 'Connector missing',
    }),
    color: 'warning',
    description: i18n.translate('xpack.alertingV2.imports.status.connectorMissingDescription', {
      defaultMessage: 'The webhook connector was deleted. Delete this import and set it up again.',
    }),
  },
  workflow_missing: {
    label: i18n.translate('xpack.alertingV2.imports.status.workflowMissing', {
      defaultMessage: 'Workflow missing',
    }),
    color: 'warning',
    description: i18n.translate('xpack.alertingV2.imports.status.workflowMissingDescription', {
      defaultMessage: 'The import workflow was deleted. Delete this import and set it up again.',
    }),
  },
};

export const IMPORT_STATUS_ORDER: ImportStatus[] = [
  'receiving',
  'waiting',
  'idle',
  'failing',
  'disabled',
  'connector_missing',
  'workflow_missing',
];

export const ImportStatusHealth = ({ status }: { status: ImportStatus }) => {
  const meta = IMPORT_STATUS_META[status];
  return (
    <EuiHealth
      color={meta.color}
      title={meta.description}
      data-test-subj={`importsStatus-${status}`}
    >
      {meta.label}
    </EuiHealth>
  );
};
