/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  interpolate,
  type AppNodeOfType,
  type DataSource,
  type StateValue,
} from '@kbn/custom-app-common';
import { CUSTOM_APP_APPLICATION_ID } from '../../common/constants';
import { inlineEsqlValues, type InlinedValue } from '../utils/inline_esql_values';

/** The id Discover registers its locator under, which is its public way of being linked to. */
const DISCOVER_LOCATOR_ID = 'DISCOVER_APP_LOCATOR';

export type ResolvedLink =
  | { status: 'ready'; href: string; navigate: () => void }
  | { status: 'unavailable'; reason: string };

const unavailable = (reason: string): ResolvedLink => ({ status: 'unavailable', reason });

/**
 * A value as it is put in a path: encoded, so that whatever it holds is one part of the path and
 * cannot add to it, such as a `/`, a `?` or a `#`. A list is its values, encoded, with commas.
 */
const toPathValues = (state: Readonly<Record<string, StateValue>>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(state).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.map(encodeURIComponent).join(',')
        : encodeURIComponent(String(value)),
    ])
  );

interface ResolveLinkOptions {
  to: AppNodeOfType<'link'>['to'];
  /** The values of the app. */
  state: Readonly<Record<string, StateValue>>;
  /** The values a query is run with: the ones of the app, and what a dashboard offers. */
  queryValues: Readonly<Record<string, InlinedValue>>;
  timeRange: TimeRange | undefined;
  getSource: (id: string) => DataSource | undefined;
  application: Pick<ApplicationStart, 'getUrlForApp' | 'navigateToApp' | 'capabilities'>;
  share: SharePluginStart | undefined;
}

/**
 * Where a link goes, when it can go there: the address to put in the link, so that it can be
 * opened in another tab, and how to go there from the page. A link that cannot be made says why.
 * Every way of going stays inside Kibana.
 */
export const resolveLink = ({
  to,
  state,
  queryValues,
  timeRange,
  getSource,
  application,
  share,
}: ResolveLinkOptions): ResolvedLink => {
  if (to.type === 'discover') {
    const locator = share?.url.locators.get<{
      query: { esql: string };
      timeRange?: TimeRange;
    }>(DISCOVER_LOCATOR_ID);
    if (!locator) {
      return unavailable(
        i18n.translate('xpack.customApp.link.noDiscover', {
          defaultMessage: 'Discover is not available.',
        })
      );
    }

    const source = getSource(to.from);
    const query = source?.type === 'esql' ? inlineEsqlValues(source.query, queryValues) : undefined;
    if (query === undefined) {
      return unavailable(
        i18n.translate('xpack.customApp.link.noQuery', {
          defaultMessage: 'This query cannot be opened in Discover.',
        })
      );
    }

    const params = { query: { esql: query }, ...(timeRange ? { timeRange } : {}) };
    return {
      status: 'ready',
      href: locator.getRedirectUrl(params),
      navigate: () => {
        void locator.navigate(params);
      },
    };
  }

  const app = to.type === 'custom_app' ? CUSTOM_APP_APPLICATION_ID : to.app;
  const path =
    to.type === 'custom_app'
      ? `/view/${encodeURIComponent(to.id)}`
      : interpolate(to.path ?? '', toPathValues(state));

  // An application that is not there, or that the person cannot open, is said so, not left to fail.
  if ((application.capabilities.navLinks as Record<string, boolean | undefined>)[app] !== true) {
    return unavailable(
      i18n.translate('xpack.customApp.link.noApp', {
        defaultMessage: 'This page is not available to you, or not in this space.',
      })
    );
  }

  return {
    status: 'ready',
    href: application.getUrlForApp(app, { path }),
    navigate: () => {
      void application.navigateToApp(app, { path });
    },
  };
};
