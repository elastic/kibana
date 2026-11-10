/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { RouteMap } from '@kbn/typed-react-router-config';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import { StreamsAppPageTemplate } from '../components/streams_app_page_template';
import { StreamsAppRouterBreadcrumb } from '../components/streams_app_router_breadcrumb';
import { RedirectTo } from '../components/redirect_to';
import { StreamManagementDefaultRedirect } from '../components/stream_management_default_redirect';
import { StreamsRootRedirect } from '../components/streams_root_redirect';
import { StreamDetailRoot } from '../components/stream_root';
import { StreamDetailManagement } from '../components/stream_management/data_management/stream_detail_management';
import { StreamsLayout } from '../components/streams_layout';
import { StreamsLayoutDefaultTabRedirect } from '../components/streams_layout/default_tab_redirect';
import { IndexInspectPage } from '../components/index_inspect/index_inspect_page';
import { DEFAULT_INDEX_INSPECT_TAB } from '../components/index_inspect/types';

/**
 * Optional time range query params.
 * DateRangeRedirect ensures these are present at runtime.
 */
const timeRangeQueryParams = t.partial({
  rangeFrom: t.string,
  rangeTo: t.string,
});

const flyoutParams = t.partial({
  flyoutName: t.string,
  flyoutTab: t.string,
});

/**
 * Extended query params for management routes that may include
 * additional feature-specific params (e.g., data quality page state).
 */
const managementQueryParams = t.partial({
  rangeFrom: t.string,
  rangeTo: t.string,
  // Data quality page state
  pageState: t.string,
});

/**
 * The unit an index page was opened from, used only for its back link.
 */
const unitQueryParams = t.partial({
  unitId: t.string,
});

/**
 * The array of route definitions to be used when the application
 * creates the routes.
 *
 * Query params (rangeFrom/rangeTo) are optional - navigation calls can omit them
 * and DateRangeRedirect will ensure they're populated from the global timefilter.
 */
const streamsAppRoutes = {
  '/': {
    element: (
      <StreamsAppRouterBreadcrumb
        title={i18n.translate('xpack.streams.appBreadcrumbTitle', {
          defaultMessage: 'Streams',
        })}
        path="/"
      >
        <StreamsAppPageTemplate>
          <Outlet />
        </StreamsAppPageTemplate>
      </StreamsAppRouterBreadcrumb>
    ),
    children: {
      '/': {
        element: <StreamsRootRedirect />,
        params: t.partial({
          query: timeRangeQueryParams,
        }),
      },
      /**
       * Declared before `/{key}` so `v2` wins over a stream name.
       */
      '/v2': {
        element: <Outlet />,
        children: {
          '/v2': {
            element: <StreamsLayoutDefaultTabRedirect unitId={STREAMS_DEFAULT_UNIT_ID} />,
            params: t.partial({
              query: timeRangeQueryParams,
            }),
          },
          '/v2/unit/{unitId}': {
            element: <StreamsLayoutDefaultTabRedirect />,
            params: t.intersection([
              t.type({
                path: t.type({
                  unitId: t.string,
                }),
              }),
              t.partial({
                query: timeRangeQueryParams,
              }),
            ]),
          },
          '/v2/unit/{unitId}/{tab}': {
            element: <StreamsLayout />,
            params: t.intersection([
              t.type({
                path: t.type({
                  unitId: t.string,
                  tab: t.string,
                }),
              }),
              t.partial({
                query: t.intersection([timeRangeQueryParams, flyoutParams]),
              }),
            ]),
          },
          '/v2/indices/{indexName}': {
            element: (
              <RedirectTo
                path="/v2/indices/{indexName}/{tab}"
                params={{ path: { tab: DEFAULT_INDEX_INSPECT_TAB } }}
              />
            ),
            params: t.intersection([
              t.type({
                path: t.type({
                  indexName: t.string,
                }),
              }),
              t.partial({
                query: t.intersection([timeRangeQueryParams, unitQueryParams]),
              }),
            ]),
          },
          '/v2/indices/{indexName}/{tab}': {
            element: <IndexInspectPage />,
            params: t.intersection([
              t.type({
                path: t.type({
                  indexName: t.string,
                  tab: t.string,
                }),
              }),
              t.partial({
                query: t.intersection([managementQueryParams, unitQueryParams]),
              }),
            ]),
          },
        },
      },
      '/{key}': {
        element: (
          <StreamDetailRoot>
            <Outlet />
          </StreamDetailRoot>
        ),
        params: t.intersection([
          t.type({
            path: t.type({
              key: t.string,
            }),
          }),
          t.partial({
            query: timeRangeQueryParams,
          }),
        ]),
        children: {
          '/{key}': {
            element: <StreamManagementDefaultRedirect />,
          },
          /**
           * This route redirects from legacy overview/dashboard links to the management page
           */
          '/{key}/{tab}': {
            element: <StreamManagementDefaultRedirect />,
            params: t.intersection([
              t.type({
                path: t.type({
                  tab: t.string,
                }),
              }),
              t.partial({
                query: timeRangeQueryParams,
              }),
            ]),
          },
          '/{key}/management/{tab}': {
            element: <StreamDetailManagement />,
            params: t.intersection([
              t.type({
                path: t.type({
                  tab: t.string,
                }),
              }),
              t.partial({
                query: managementQueryParams,
              }),
            ]),
          },
          /**
           * This route is added as a catch-all route to redirect to the retention tab in case of a
           * invalid subtab or a missing subtab.
           * Works on more in-depth routes as well, e.g. /{key}/management/{tab}/{subtab}/random-path.
           */
          '/*': {
            element: <StreamManagementDefaultRedirect />,
          },
        },
      },
    },
  },
} satisfies RouteMap;

export type StreamsAppRoutes = typeof streamsAppRoutes;

export const streamsAppRouter = createRouter(streamsAppRoutes);

export type StreamsAppRouter = typeof streamsAppRouter;
