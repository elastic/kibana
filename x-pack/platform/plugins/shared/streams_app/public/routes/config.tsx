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
import { StreamsAppPageTemplate } from '../components/streams_app_page_template';
import { StreamsAppRouterBreadcrumb } from '../components/streams_app_router_breadcrumb';
import { RedirectTo } from '../components/redirect_to';
import { StreamListView } from '../components/stream_list_view';
import { StreamDetailRoot } from '../components/stream_root';
import { StreamDetailManagement } from '../components/data_management/stream_detail_management';
import { SignificantEventsDiscoveryPage } from '../components/significant_events_discovery/page';

/**
 * The array of route definitions to be used when the application
 * creates the routes.
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
        element: <StreamListView />,
      },
      '/_discovery': {
        element: <SignificantEventsDiscoveryPage />,
      },
      '/{key}': {
        element: (
          <StreamDetailRoot>
            <Outlet />
          </StreamDetailRoot>
        ),
        params: t.type({
          path: t.type({
            key: t.string,
          }),
        }),
        children: {
          '/{key}': {
            element: (
              <RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'retention' } }} />
            ),
          },
          /**
           * This route matching the StreamDetailView will be temporarily disable as it does not provide additional value than the stream list and retention view
           */
          // '/{key}/{tab}': {
          //   element: <StreamDetailView />,
          //   params: t.type({
          //     path: t.type({
          //       tab: t.string,
          //     }),
          //   }),
          // },
          /**
           * This route is added as a replacement of the old StreamDetailView routing to redirect from existing overview/dashboard links into the management page
           */
          '/{key}/{tab}': {
            element: (
              <RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'retention' } }} />
            ),
            params: t.type({
              path: t.type({
                tab: t.string,
              }),
            }),
          },
          '/{key}/management/{tab}': {
            element: <StreamDetailManagement />,
            params: t.type({
              path: t.type({
                tab: t.string,
              }),
            }),
          },
          /**
           * This route is added as a catch-all route to redirect to the retention tab in case of a
           * invalid subtab or a missing subtab.
           * Works on more in-depth routes as well, e.g. /{key}/management/{tab}/{subtab}/random-path.
           */
          '/*': {
            element: (
              <RedirectTo path="/{key}/management/{tab}" params={{ path: { tab: 'retention' } }} />
            ),
          },
        },
      },
    },
  },
} satisfies RouteMap;

export type StreamsAppRoutes = typeof streamsAppRoutes;

export const streamsAppRouter = createRouter(streamsAppRoutes);

export type StreamsAppRouter = typeof streamsAppRouter;
