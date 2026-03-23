/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { i18n } from '@kbn/i18n';
import type { AttachmentType } from '@kbn/streams-plugin/server/lib/streams/attachments/types';

export const ATTACHMENT_TYPE_CONFIG: Record<AttachmentType, { label: string; icon: EuiIconType }> =
  {
    dashboard: {
      label: i18n.translate('xpack.streams.attachmentTypeConfig.typeDashboard', {
        defaultMessage: 'Dashboard',
      }),
      icon: 'dashboardApp',
    },
    rule: {
      label: i18n.translate('xpack.streams.attachmentTypeConfig.typeRule', {
        defaultMessage: 'Rule',
      }),
      icon: 'bell',
    },
    slo: {
      label: i18n.translate('xpack.streams.attachmentTypeConfig.typeSlo', {
        defaultMessage: 'SLO',
      }),
      icon: 'watchesApp',
    },
  };
