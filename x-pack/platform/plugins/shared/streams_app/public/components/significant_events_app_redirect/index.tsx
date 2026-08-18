/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useRef } from 'react';
import { EuiLoadingElastic } from '@elastic/eui';
import { SIGNIFICANT_EVENTS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import type {
  SignificantEventsAppLocatorParams,
  SignificantEventsAppTab,
} from '@kbn/significant-events-app-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';
import { useSignificantEventsApp } from '../../hooks/use_significant_events_app';
import { RedirectTo } from '../redirect_to';

const LOCATOR_PARAM_KEYS = [
  'tab',
  'rangeFrom',
  'rangeTo',
  'search',
  'status',
  'type',
  'subtype',
  'stream',
  'showComputed',
  'selectedItem',
  'selectedEvent',
] as const satisfies ReadonlyArray<keyof SignificantEventsAppLocatorParams>;

function pickLocatorParams(
  source: Record<string, unknown> | undefined
): SignificantEventsAppLocatorParams {
  if (!source) {
    return {};
  }
  const picked: SignificantEventsAppLocatorParams = {};
  for (const key of LOCATOR_PARAM_KEYS) {
    if (source[key] !== undefined) {
      // Assign through a mutable index — values are already route-decoded.
      (picked as Record<string, unknown>)[key] = source[key];
    }
  }
  return picked;
}

export interface SignificantEventsAppRedirectProps {
  overrides?: SignificantEventsAppLocatorParams;
}

/**
 * Redirects into the significant_events app via its share-plugin locator.
 *
 * On `/_discovery` / `/_discovery/{tab}` the tab and query come from the
 * streams router. Callers can pass locator params (e.g. `tab`, `stream`) to
 * override or supply values when used outside those routes.
 *
 * When Significant Events is unavailable, bookmarks fall back to the Streams
 * landing page — there is no in-app destination left for the old discovery URLs.
 */
export function SignificantEventsAppRedirect({
  overrides = {},
}: SignificantEventsAppRedirectProps = {}) {
  const { isAvailable, isLoading } = useSignificantEventsApp();
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const locator = share.url.locators.get<SignificantEventsAppLocatorParams>(
    SIGNIFICANT_EVENTS_APP_LOCATOR_ID
  );
  const discoveryParams = useStreamsAppParams('/_discovery/{tab}', true);
  const { query: currentQuery } = useStreamsAppParams('/*');

  const paramsRef = useRef<SignificantEventsAppLocatorParams>({});
  paramsRef.current = {
    ...pickLocatorParams(currentQuery as Record<string, unknown>),
    ...pickLocatorParams(discoveryParams?.query as Record<string, unknown> | undefined),
    tab: discoveryParams?.path?.tab as SignificantEventsAppTab | undefined,
    ...overrides,
  };

  useLayoutEffect(() => {
    if (isLoading || !isAvailable || !locator) {
      return;
    }

    void locator.navigate(paramsRef.current, { replace: true }).catch(() => {
      toasts.addDanger({
        title: i18n.translate('xpack.streams.significantEventsAppRedirect.navigateErrorTitle', {
          defaultMessage: 'Could not open Significant Events',
        }),
        text: i18n.translate('xpack.streams.significantEventsAppRedirect.navigateErrorBody', {
          defaultMessage:
            'Navigation to the Significant Events app failed. Try again from the Streams page.',
        }),
      });
    });
  }, [isLoading, isAvailable, locator, toasts]);

  if (isLoading) {
    return <EuiLoadingElastic size="xxl" />;
  }

  if (!isAvailable) {
    return <RedirectTo path="/" />;
  }

  return null;
}
