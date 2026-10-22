/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import {
  cameFromDataManagementOverview,
  DATA_MANAGEMENT_OVERVIEW_PATH,
  DATA_MANAGEMENT_OVERVIEW_RETURN_PARAM,
  DATA_MANAGEMENT_OVERVIEW_RETURN_VALUE,
} from '@kbn/management-plugin/common';
import { useKibana } from './use_kibana';
import { useStreamsAppRouter } from './use_streams_app_router';

/**
 * Back target for a stream detail page. Returns to the data management overview when that page
 * opened the stream, and to the streams list otherwise.
 */
export function useStreamDetailBack() {
  const { search } = useLocation();
  const router = useStreamsAppRouter();
  const {
    core: { application },
  } = useKibana();
  const fromOverview = cameFromDataManagementOverview(search);

  const back = useMemo(() => {
    if (fromOverview) {
      return {
        href: application.getUrlForApp('management', { path: DATA_MANAGEMENT_OVERVIEW_PATH }),
        label: i18n.translate('xpack.streams.streamDetailView.backToDataManagementOverviewLabel', {
          defaultMessage: 'Overview',
        }),
      };
    }
    return {
      href: router.link('/'),
      label: i18n.translate('xpack.streams.streamDetailView.backToStreamsLabel', {
        defaultMessage: 'Streams',
      }),
    };
  }, [application, fromOverview, router]);

  const withReturnQuery = useMemo(() => {
    return <TQuery extends Record<string, string | undefined>>(query: TQuery) =>
      fromOverview
        ? { ...query, [DATA_MANAGEMENT_OVERVIEW_RETURN_PARAM]: DATA_MANAGEMENT_OVERVIEW_RETURN_VALUE }
        : query;
  }, [fromOverview]);

  return { back, withReturnQuery };
}
