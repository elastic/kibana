/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { MaterializeInput } from '../../common';
import { createTestKitServices } from '../materialize/kit/kit_services.mock';
import { createScopedMaterializeClient } from '../materialize/materialize_client';
import { MaterializerRegistry } from '../materialize/registry';
import { createNodeValidator } from '../materialize/validate_node';
import { createImageMaterializer } from './image';
import { createLinksMaterializer } from './links';
import { createMarkdownMaterializer } from './markdown';
import { escapeMarkdownText, markdownDestination } from './markdown_text';

const KIBANA_URL = 'https://kibana.example.com/s/marketing';

const setup = () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const registry = new MaterializerRegistry();
  registry.register('markdown', createMarkdownMaterializer());
  registry.register('image', createImageMaterializer());
  registry.register('links', createLinksMaterializer({ getKibanaUrl: () => KIBANA_URL }));
  const client = createScopedMaterializeClient({
    registry,
    scope: {
      request: httpServerMock.createKibanaRequest(),
      savedObjectsClient,
      abortSignal: new AbortController().signal,
    },
    isEnabled: async () => true,
    logger: loggingSystemMock.createLogger(),
    search: { esql: jest.fn() },
    validate: createNodeValidator(),
    getKitServices: createTestKitServices,
    getSelectionServices: jest.fn(),
    getAggsServices: jest.fn(),
    kibanaVersion: '9.7.0',
    now: () => new Date('2025-01-15T12:00:00.000Z'),
  });
  const materialize = (input: MaterializeInput) => client.materialize(input);
  return { materialize, savedObjectsClient };
};

describe('the Markdown materializer', () => {
  it('materializes a panel by value as markdown', async () => {
    const { materialize } = setup();
    await expect(
      materialize({
        type: 'markdown',
        config: {
          title: 'Notes',
          content: '## Notes\n\nSee the [runbook](https://example.com).',
          settings: { open_links_in_new_tab: true },
        },
      })
    ).resolves.toEqual({
      type: 'markdown',
      text: '## Notes\n\nSee the [runbook](https://example.com).',
    });
  });

  it('loads a Markdown library item by ID', async () => {
    const { materialize, savedObjectsClient } = setup();
    savedObjectsClient.get.mockResolvedValue({
      id: 'note-1',
      type: 'markdown',
      references: [],
      attributes: { title: 'Runbook', content: '**Check the logs.**' },
    });

    await expect(materialize({ type: 'markdown', id: 'note-1' })).resolves.toEqual({
      type: 'markdown',
      text: '**Check the logs.**',
    });
    expect(savedObjectsClient.get).toHaveBeenCalledWith('markdown', 'note-1');
  });

  it('returns unsupported for an empty panel', async () => {
    const { materialize } = setup();
    await expect(
      materialize({ type: 'markdown', config: { title: 'Empty', content: '  ' } })
    ).resolves.toEqual(
      expect.objectContaining({
        type: 'unsupported',
        title: 'Empty',
        reason: 'This Markdown panel is empty.',
      })
    );
  });
});

describe('the Image materializer', () => {
  it('materializes an image at a URL as a markdown image with its alt text', async () => {
    const { materialize } = setup();
    await expect(
      materialize({
        type: 'image',
        config: {
          title: 'Logo',
          image_config: {
            src: { type: 'url', url: 'https://example.com/logo (dark).png' },
            alt_text: 'Elastic [logo]',
            object_fit: 'contain',
          },
        },
      })
    ).resolves.toEqual({
      type: 'markdown',
      text: '![Elastic \\[logo\\]](https://example.com/logo%20%28dark%29.png)',
    });
  });

  it('returns unsupported for an image uploaded to Kibana, or at a URL no surface can load', async () => {
    const { materialize } = setup();
    await expect(
      materialize({
        type: 'image',
        config: { title: 'Logo', image_config: { src: { type: 'file', file_id: 'abc' } } },
      })
    ).resolves.toEqual(
      expect.objectContaining({
        type: 'unsupported',
        title: 'Logo',
        reason: 'Images uploaded to Kibana cannot be shown here yet.',
      })
    );
    await expect(
      materialize({
        type: 'image',
        config: { image_config: { src: { type: 'url', url: '/plugins/logo.png' } } },
      })
    ).resolves.toEqual(
      expect.objectContaining({
        type: 'unsupported',
        reason: 'Only images at an absolute http or https URL can be shown here.',
      })
    );
  });
});

describe('the Links materializer', () => {
  it('materializes one external link as a link', async () => {
    const { materialize } = setup();
    await expect(
      materialize({
        type: 'links',
        config: {
          layout: 'vertical',
          links: [
            {
              type: 'externalLink',
              destination: 'https://www.elastic.co/docs',
              label: 'Docs',
              options: { open_in_new_tab: true, encode_url: true },
            },
          ],
        },
      })
    ).resolves.toEqual({ type: 'link', label: 'Docs', url: 'https://www.elastic.co/docs' });
  });

  it("names an unlabeled dashboard link for its dashboard, and links in Kibana's app", async () => {
    const { materialize, savedObjectsClient } = setup();
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: 'flights',
          type: 'dashboard',
          references: [],
          attributes: { title: '[Flights] Global' },
        },
      ],
    });

    await expect(
      materialize({
        type: 'links',
        config: { links: [{ type: 'dashboardLink', destination: 'flights', options: {} }] },
      })
    ).resolves.toEqual({
      type: 'link',
      label: '[Flights] Global',
      app: 'dashboards',
      path: '#/view/flights',
    });
  });

  it('materializes several links as a markdown list, or one line when horizontal', async () => {
    const { materialize, savedObjectsClient } = setup();
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: 'gone',
          type: 'dashboard',
          references: [],
          attributes: {},
          error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
        },
      ],
    });
    const links = [
      { type: 'dashboardLink', destination: 'logs', label: 'Web *traffic*', options: {} },
      { type: 'dashboardLink', destination: 'gone', options: {} },
      { type: 'externalLink', destination: 'https://example.com/a b', options: {} },
    ];

    await expect(
      materialize({ type: 'links', config: { layout: 'vertical', links } })
    ).resolves.toEqual({
      type: 'markdown',
      text: [
        `- [Web \\*traffic\\*](${KIBANA_URL}/app/dashboards#/view/logs)`,
        '- Error fetching dashboard',
        '- [https://example.com/a b](https://example.com/a%20b)',
      ].join('\n'),
    });
    await expect(
      materialize({ type: 'links', config: { layout: 'horizontal', links } })
    ).resolves.toEqual({
      type: 'markdown',
      text: [
        `[Web \\*traffic\\*](${KIBANA_URL}/app/dashboards#/view/logs)`,
        'Error fetching dashboard',
        '[https://example.com/a b](https://example.com/a%20b)',
      ].join(' · '),
    });
  });

  it('returns unsupported for a panel without links', async () => {
    const { materialize } = setup();
    await expect(materialize({ type: 'links', config: { links: [] } })).resolves.toEqual(
      expect.objectContaining({ type: 'unsupported', reason: 'This links panel has no links.' })
    );
  });
});

describe('Markdown text', () => {
  it('escapes what would end link text or start emphasis, and keeps one line', () => {
    expect(escapeMarkdownText(' a [b]\n*c* `d` <e> ')).toBe('a \\[b\\] \\*c\\* \\`d\\` \\<e\\>');
  });

  it('encodes what would end a destination', () => {
    expect(markdownDestination('https://x.example/a (b)<c>')).toBe(
      'https://x.example/a%20%28b%29%3Cc%3E'
    );
  });
});
