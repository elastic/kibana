/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RouteMap } from '@kbn/typed-react-router-config';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import * as t from 'io-ts';
import React from 'react';
import { SignificantEventsAppPageTemplate } from '../components/page_template';
import { RedirectTo } from '../components/redirect_to';
import { SignificantEventsPage } from '../pages/significant_events/page';

/**
 * The array of route definitions to be used when the application creates the routes.
 *
 * Query params (rangeFrom/rangeTo) are optional - navigation calls can omit them and
 * DateRangeRedirect will ensure they're populated from the global timefilter.
 */
const significantEventsAppRoutes = {
  '/': {
    element: (
      <SignificantEventsAppPageTemplate>
        <Outlet />
      </SignificantEventsAppPageTemplate>
    ),
    children: {
      '/': {
        element: <RedirectTo path="/{tab}" params={{ path: { tab: 'streams' } }} />,
      },
      '/{tab}': {
        element: <SignificantEventsPage />,
        params: t.intersection([
          t.type({
            path: t.type({
              tab: t.string,
            }),
          }),
          t.partial({
            query: t.partial({
              rangeFrom: t.string,
              rangeTo: t.string,
              search: t.string,
              status: t.string,
              type: t.union([t.string, t.array(t.string)]),
              subtype: t.union([t.string, t.array(t.string)]),
              stream: t.union([t.string, t.array(t.string)]),
              showComputed: t.string,
              selectedItem: t.string,
              selectedEvent: t.string,
            }),
          }),
        ]),
      },
    },
  },
} satisfies RouteMap;

export type SignificantEventsAppRoutes = typeof significantEventsAppRoutes;

export const significantEventsAppRouter = createRouter(significantEventsAppRoutes);

export type SignificantEventsAppRouter = typeof significantEventsAppRouter;
