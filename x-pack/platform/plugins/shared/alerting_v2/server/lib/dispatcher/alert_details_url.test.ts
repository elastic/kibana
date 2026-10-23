/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseSearchParams } from '@kbn/share-plugin/common/url_service';
import { OBSERVABILITY_ALERTING_HOST } from '../../../common/locators';
import { createAlertingV2LocatorsMock, MOCK_KIBANA_BASE_URL } from '../locators/tokens.mock';
import { buildAlertDetailsUrl } from './alert_details_url';

describe('buildAlertDetailsUrl', () => {
  const { episodesLocators: episodesLocator } = createAlertingV2LocatorsMock();

  const build = (spaceId: string, baseUrl: string = MOCK_KIBANA_BASE_URL) =>
    buildAlertDetailsUrl({ episodesLocator, baseUrl, spaceId, alertId: 'ep-1' });

  const parse = (url: string) => {
    const { origin, pathname, search } = new URL(url);
    return { origin, pathname, redirect: parseSearchParams(search) };
  };

  it('builds an absolute redirect link through the episodes locator', () => {
    const { origin, pathname, redirect } = parse(build('default'));

    expect(origin).toBe(MOCK_KIBANA_BASE_URL);
    expect(pathname).toBe('/app/r');
    expect(redirect).toEqual(
      expect.objectContaining({
        id: episodesLocator.id,
        params: { episodeId: 'ep-1', host: OBSERVABILITY_ALERTING_HOST.alerts },
      })
    );
  });

  it('adds the space prefix for non-default spaces', () => {
    expect(parse(build('team-a')).pathname).toBe('/s/team-a/app/r');
  });

  it('resolves relative redirect links against the base URL', () => {
    expect(build('team-a', 'https://cloud.example.com')).toMatch(
      /^https:\/\/cloud\.example\.com\/s\/team-a\/app\/r\?/
    );
  });
});
