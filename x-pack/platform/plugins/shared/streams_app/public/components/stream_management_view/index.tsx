/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { StreamDetailManagement } from '../data_management/stream_detail_management';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';

export function StreamManagementView() {
  const {
    path: { key, tab },
  } = useStreamsAppParams('/{key}/management/{tab}', true);

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: i18n.translate('xpack.streams.streamManagementView.title', {
          defaultMessage: 'Manage stream',
        }),
        path: `/{key}/management/{tab}`,
        params: { path: { key, tab } },
      } as const,
    ];
  }, [key, tab]);

  return <StreamDetailManagement />;
}
