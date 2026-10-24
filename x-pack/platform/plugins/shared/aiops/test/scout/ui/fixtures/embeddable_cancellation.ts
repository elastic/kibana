/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export const TIME_RANGE = {
  from: '2016-01-01T00:00:00.000Z',
  to: '2020-11-01T00:00:00.000Z',
} as const;

const FAREQUOTE_DATA_VIEW = 'ft_farequote';

/** Stalls data-view searches long enough to cancel them while they are in flight. */
export const STALLING_FILTER = {
  type: 'dsl',
  dsl: {
    query: {
      error_query: {
        indices: [
          {
            name: '*',
            error_type: 'warning',
            message: "'Watch out!'",
            stall_time_seconds: 5,
          },
        ],
      },
    },
  },
} as const;

/** Search endpoint data-view panels issue requests against. */
const SEARCH_ENDPOINT = '/internal/search/ese';

interface CancellationPageObjects {
  dashboard: {
    openDashboardWithId: (id: string, options: { waitForRender: boolean }) => Promise<void>;
  };
  collapsibleNav: {
    clickItem: (itemName: 'Discover') => Promise<void>;
  };
}

export async function ensureFarequoteDataView(
  apiServices: ApiServicesFixture,
  spaceId: string
): Promise<string> {
  const { data: existing } = await apiServices.dataViews.getAll(spaceId);
  const match = existing.find((dataView) => dataView.title === FAREQUOTE_DATA_VIEW);
  if (match?.id) {
    return match.id;
  }

  const { data: created } = await apiServices.dataViews.create({
    title: FAREQUOTE_DATA_VIEW,
    timeFieldName: '@timestamp',
    spaceId,
  });
  if (!created.id) {
    throw new Error(`Failed to create the ${FAREQUOTE_DATA_VIEW} data view`);
  }
  return created.id;
}

export async function deleteFarequoteDataView(
  apiServices: ApiServicesFixture,
  spaceId: string
): Promise<void> {
  await apiServices.dataViews.deleteByTitle(FAREQUOTE_DATA_VIEW, spaceId);
}

/** Data-view searches are cancelled with a DELETE to the async search endpoint. */
export async function expectSearchDeletedOnNavigate(
  page: ScoutPage,
  pageObjects: CancellationPageObjects,
  dashboardId: string
): Promise<void> {
  const searchRequestPromise = page.waitForResponse(
    (response) => response.url().includes(SEARCH_ENDPOINT) && response.ok(),
    { timeout: 30_000 }
  );
  await pageObjects.dashboard.openDashboardWithId(dashboardId, { waitForRender: false });
  await searchRequestPromise;

  const deleteRequest = page.waitForRequest(
    (request) => request.method() === 'DELETE' && request.url().includes(SEARCH_ENDPOINT),
    { timeout: 15_000 }
  );
  await pageObjects.collapsibleNav.clickItem('Discover');
  await deleteRequest;
}

export async function expectSearchDeletedOnCancel(
  page: ScoutPage,
  pageObjects: CancellationPageObjects,
  dashboardId: string
): Promise<void> {
  const searchRequestPromise = page.waitForResponse(
    (response) => response.url().includes(SEARCH_ENDPOINT) && response.ok(),
    { timeout: 30_000 }
  );
  await pageObjects.dashboard.openDashboardWithId(dashboardId, { waitForRender: false });
  await searchRequestPromise;

  const cancelButton = page.testSubj.locator('queryCancelButton');
  await cancelButton.waitFor({ state: 'visible' });

  const deleteRequest = page.waitForRequest(
    (request) => request.method() === 'DELETE' && request.url().includes(SEARCH_ENDPOINT),
    { timeout: 15_000 }
  );
  await cancelButton.click();
  await deleteRequest;

  await cancelButton.waitFor({ state: 'hidden' });
  await expect(page.testSubj.locator('embeddableError')).toBeHidden();
}
