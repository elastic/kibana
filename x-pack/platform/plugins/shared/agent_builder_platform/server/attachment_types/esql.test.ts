/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, type EsqlAttachmentData } from '@kbn/agent-builder-common/attachments';
import { createEsqlAttachmentType, type DiscoverEsqlLocator } from './esql';
import { SURFACE_BASE_URL, renderSurface, surfaceContext } from './test_helpers';

jest.mock('@kbn/esql-language', () => ({ validateQuery: jest.fn() }));

const discoverLocator: DiscoverEsqlLocator = {
  getLocation: jest.fn(async ({ query: { esql } }) => ({
    app: 'discover',
    path: `#/?_a=(query:(esql:'${encodeURIComponent(esql)}'))`,
  })),
};

const toComposition = (data: EsqlAttachmentData, locator?: DiscoverEsqlLocator) =>
  createEsqlAttachmentType({ getDiscoverLocator: () => locator }).toSurfaceComposition?.(
    { id: 'esql-1', type: AttachmentType.esql, data },
    surfaceContext
  );

describe('esql attachment type', () => {
  describe('toSurfaceComposition', () => {
    it('shows the description, the query as ES|QL code and a link to it in Discover', async () => {
      const composition = await toComposition(
        { query: 'FROM logs | LIMIT 10', description: 'Latest logs' },
        discoverLocator
      );

      expect(composition).toEqual({
        type: 'view',
        body: [
          { type: 'markdown', text: 'Latest logs' },
          { type: 'code', language: 'esql', text: 'FROM logs | LIMIT 10' },
          {
            type: 'link',
            label: 'Open in Discover',
            app: 'discover',
            path: "#/?_a=(query:(esql:'FROM%20logs%20%7C%20LIMIT%2010'))",
          },
        ],
      });
      expect(discoverLocator.getLocation).toHaveBeenCalledWith({
        query: { esql: 'FROM logs | LIMIT 10' },
      });

      const { valid, slack } = await renderSurface(composition);
      expect(valid).toBe(true);
      expect(slack).toContain(`${SURFACE_BASE_URL}/app/discover#/?_a=`);
      expect(slack).toContain('Open in Discover');
    });

    it('leaves out the description when there is none', async () => {
      const composition = await toComposition({ query: 'FROM logs' }, discoverLocator);

      expect(composition?.body.map(({ type }) => type)).toEqual(['code', 'link']);
    });

    it('leaves out the link when Discover has no locator', async () => {
      const composition = await toComposition({ query: 'FROM logs' });

      expect(composition?.body.map(({ type }) => type)).toEqual(['code']);
    });

    it('leaves out the link when the locator fails', async () => {
      const composition = await toComposition(
        { query: 'FROM logs' },
        { getLocation: () => Promise.reject(new Error('boom')) }
      );

      expect(composition?.body.map(({ type }) => type)).toEqual(['code']);
    });

    it('leaves out the link when its path is too long for one', async () => {
      const composition = await toComposition(
        { query: `FROM logs | WHERE message == "${'x'.repeat(2500)}"` },
        discoverLocator
      );

      expect(composition?.body.map(({ type }) => type)).toEqual(['code']);
    });

    it('cuts a query too long to show, and still renders', async () => {
      const composition = await toComposition({ query: `FROM logs ${'| LIMIT 1 '.repeat(2000)}` });
      const { valid, errors } = await renderSurface(composition);

      expect(errors).toEqual([]);
      expect(valid).toBe(true);
    });
  });
});
