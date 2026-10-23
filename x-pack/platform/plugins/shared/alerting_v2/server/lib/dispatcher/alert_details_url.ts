/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import {
  OBSERVABILITY_ALERTING_HOST,
  type AlertingV2EpisodesLocatorParams,
} from '../../../common/locators';

/** Builds an absolute, space-aware episodes-locator redirect link to an alert details page. */
export const buildAlertDetailsUrl = ({
  episodesLocator,
  baseUrl,
  spaceId,
  alertId,
}: {
  episodesLocator: Pick<LocatorPublic<AlertingV2EpisodesLocatorParams>, 'getRedirectUrl'>;
  baseUrl: string;
  spaceId: string;
  alertId: string;
}): string =>
  // Without `publicBaseUrl` the share service returns a relative link, so resolve it
  // against the Kibana base URL to keep notification links absolute.
  new URL(
    episodesLocator.getRedirectUrl(
      { episodeId: alertId, host: OBSERVABILITY_ALERTING_HOST.alerts },
      { spaceId }
    ),
    baseUrl
  ).toString();
