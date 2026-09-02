/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderBack } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useTimeRange } from './use_time_range';
import { useStreamsAppRouter } from './use_streams_app_router';
import { useStreamsPrivileges } from './use_streams_privileges';

/**
 * Back target for destination / stream detail. In the new Streams layout the
 * Destinations table is the parent of a destination page.
 */
export const useStreamsAppHeaderBack = (): AppHeaderBack => {
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const {
    features: { canvas },
  } = useStreamsPrivileges();

  if (canvas.enabled) {
    return {
      href: router.link('/new-experience/{tab}', {
        path: { tab: 'destinations' },
        query: { rangeFrom, rangeTo },
      }),
      label: i18n.translate('xpack.streams.streamDetailView.backToDestinationsLabel', {
        defaultMessage: 'Destinations',
      }),
    };
  }

  return {
    href: router.link('/'),
    label: i18n.translate('xpack.streams.streamDetailView.backToStreamsLabel', {
      defaultMessage: 'Streams',
    }),
  };
};
