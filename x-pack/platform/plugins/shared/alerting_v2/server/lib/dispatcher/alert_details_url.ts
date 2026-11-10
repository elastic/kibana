/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import { OBSERVABILITY_ALERTING_BASE_PATH } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ALERTING_HOST } from '../../../common/locators';
import { getEpisodesLocation } from '../../../common/locators/locator_get_location';

/** Builds an absolute, space-aware direct link to an alert details page. */
export const buildAlertDetailsUrl = ({
  baseUrl,
  spaceId,
  alertId,
}: {
  baseUrl: string;
  spaceId: string;
  alertId: string;
}): string => {
  const { path } = getEpisodesLocation({
    episodeId: alertId,
    host: OBSERVABILITY_ALERTING_HOST.alerts,
  });
  /* The server has no application registry to resolve the app id to its route, so the
   * base path must stay in sync with the app of `OBSERVABILITY_ALERTING_HOST`.
   * In the future we should probably hop to a generic page and redirect based on the space
   * or serverless project context */
  return addSpaceIdToPath(baseUrl, spaceId, `${OBSERVABILITY_ALERTING_BASE_PATH}${path}`);
};
