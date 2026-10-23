/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  deleteConversations,
  getSectionCounts,
  sectionCountsOf,
  seedInvestigation,
  type SectionCountsBody,
} from '../../fixtures';

const RUN = `scout-section-counts-${Date.now()}`;
// Its own Space, so the totals hold only this suite's investigations.
const SPACE_ID = `inv-section-counts-${Date.now()}`;

const NONE_MATCHING = { critical: 0, high: 0, medium: 0, low: 0, none: 0, closed: 0 };
const TOTALS = { critical: 0, high: 2, medium: 1, low: 1, none: 1, closed: 1 };

apiTest.describe(
  'GET /internal/investigations/investigations/_section_counts',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let ids: string[] = [];

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient }) => {
      await apiServices.spaces.create({ id: SPACE_ID, name: SPACE_ID });
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      const seed = (title: string, metadata: Record<string, string>) =>
        seedInvestigation(apiClient, cookieHeader, { title, metadata, spaceId: SPACE_ID });

      ids = await Promise.all([
        seed(`${RUN} checkout latency`, {
          status: 'open',
          severity: 'high',
          summary: 'Gold token requests are slow',
        }),
        seed(`${RUN} cart errors`, { status: 'open', severity: 'high', summary: 'Cart fails' }),
        seed(`${RUN} payment`, {
          status: 'open',
          severity: 'medium',
          verdict: 'kraken outage',
          description: 'zeppelin',
        }),
        // A missing status reads as open.
        seed(`${RUN} shipping`, { severity: 'low' }),
        seed(`${RUN} unrated`, { status: 'open' }),
        seed(`${RUN} resolved`, { status: 'closed', severity: 'critical', summary: 'gold' }),
      ]);
    });

    apiTest.afterAll(async ({ apiServices, apiClient }) => {
      await deleteConversations(apiClient, ids, cookieHeader, SPACE_ID);
      await apiServices.spaces.delete(SPACE_ID);
    });

    const countsFor = async (
      apiClient: Parameters<typeof getSectionCounts>[0],
      query?: string
    ): Promise<SectionCountsBody> => {
      const response = await getSectionCounts(apiClient, cookieHeader, {
        query,
        spaceId: SPACE_ID,
      });
      expect(response).toHaveStatusCode(200);
      return response.body as SectionCountsBody;
    };

    apiTest(
      'counts open investigations per severity and closed ones without a query',
      async ({ apiClient }) => {
        const body = await countsFor(apiClient);

        expect(sectionCountsOf(body, 'total')).toStrictEqual(TOTALS);
        expect(sectionCountsOf(body, 'matching')).toStrictEqual(TOTALS);
      }
    );

    apiTest('keeps the totals and counts only the matches for a query', async ({ apiClient }) => {
      const body = await countsFor(apiClient, 'gold token');

      expect(sectionCountsOf(body, 'total')).toStrictEqual(TOTALS);
      expect(sectionCountsOf(body, 'matching')).toStrictEqual({ ...NONE_MATCHING, high: 1 });
    });

    apiTest(
      'needs every word, case-insensitive, across the title and the summary',
      async ({ apiClient }) => {
        expect(
          sectionCountsOf(await countsFor(apiClient, 'GOLD Checkout'), 'matching')
        ).toStrictEqual({ ...NONE_MATCHING, high: 1 });
        expect(sectionCountsOf(await countsFor(apiClient, 'gold cart'), 'matching')).toStrictEqual(
          NONE_MATCHING
        );
        expect(sectionCountsOf(await countsFor(apiClient, 'gold'), 'matching')).toStrictEqual({
          ...NONE_MATCHING,
          high: 1,
          closed: 1,
        });
      }
    );

    apiTest('matches the verdict but not the description', async ({ apiClient }) => {
      expect(sectionCountsOf(await countsFor(apiClient, 'kraken'), 'matching')).toStrictEqual({
        ...NONE_MATCHING,
        medium: 1,
      });
      expect(sectionCountsOf(await countsFor(apiClient, 'zeppelin'), 'matching')).toStrictEqual(
        NONE_MATCHING
      );
    });

    apiTest('matches wildcard characters literally', async ({ apiClient }) => {
      expect(sectionCountsOf(await countsFor(apiClient, 'gol*'), 'matching')).toStrictEqual(
        NONE_MATCHING
      );
    });
  }
);
