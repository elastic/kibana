/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsBulkGetObject,
  SavedObjectsClientContract,
} from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { withByRefPanels } from './with_by_ref_panels';

const grid = { x: 0, y: 0, w: 24, h: 10 };

const savedObjects: Record<
  string,
  { attributes: Record<string, unknown>; references?: unknown[] }
> = {
  'visualization:vis-1': {
    attributes: {
      title: 'Visitors by OS',
      visState: JSON.stringify({
        type: 'pie',
        aggs: [],
      }),
    },
    references: [{ name: 'ref', type: 'index-pattern', id: 'logs-data-view' }],
  },
  'index-pattern:logs-data-view': { attributes: { title: 'kibana_sample_data_logs' } },
};

const bulkGet = jest.fn(async (objects: SavedObjectsBulkGetObject[]) => ({
  saved_objects: objects.map(({ type, id }) => {
    const found = savedObjects[`${type}:${id}`];
    return found
      ? { type, id, references: [], ...found }
      : {
          type,
          id,
          attributes: {},
          references: [],
          error: { statusCode: 404, error: 'Not Found', message: 'Saved object not found' },
        };
  }),
}));

const savedObjectsClient = { bulkGet } as unknown as SavedObjectsClientContract;
const logger = { warn: jest.fn() } as unknown as Logger;

const dashboard = (panels: DashboardAttachmentData['panels']): DashboardAttachmentData => ({
  title: 'Web traffic',
  panels,
});

const piePanel = { type: 'legacy_vis', id: 'pie', config: { savedObjectId: 'vis-1' }, grid };

describe('withByRefPanels', () => {
  beforeEach(() => {
    bulkGet.mockClear();
  });

  it('adds a summary of each by-ref panel and marks the ones it could not read', async () => {
    const data = dashboard([
      piePanel,
      { type: 'map', id: 'map', config: { savedObjectId: 'missing-map' }, grid },
      { type: 'vis', id: 'by-value', config: { data_source: { type: 'esql' } }, grid },
    ]);

    const result = await withByRefPanels(data, { savedObjectsClient, logger });

    expect(result._derived?.opaque_panels).toEqual([
      {
        panel_id: 'pie',
        saved_object_id: 'vis-1',
        resolved: true,
        title: 'Visitors by OS',
        chart_type: 'pie',
        data_views: ['kibana_sample_data_logs'],
      },
      {
        panel_id: 'map',
        saved_object_id: 'missing-map',
        resolved: false,
        error: 'Saved object not found',
      },
    ]);
  });

  it('keeps existing summaries without reading their saved objects again', async () => {
    const existing = { panel_id: 'pie', saved_object_id: 'vis-1', resolved: true, title: 'Kept' };

    const result = await withByRefPanels(
      { ...dashboard([piePanel]), _derived: { opaque_panels: [existing] } },
      { savedObjectsClient, logger }
    );

    expect(bulkGet).not.toHaveBeenCalled();
    expect(result._derived?.opaque_panels).toEqual([existing]);
  });

  it('reads saved objects again for summaries it could not resolve before', async () => {
    const unresolved = {
      panel_id: 'pie',
      saved_object_id: 'vis-1',
      resolved: false,
      error: 'Internal error',
    };

    const result = await withByRefPanels(
      { ...dashboard([piePanel]), _derived: { opaque_panels: [unresolved] } },
      { savedObjectsClient, logger }
    );

    expect(result._derived?.opaque_panels).toEqual([
      expect.objectContaining({ panel_id: 'pie', resolved: true, title: 'Visitors by OS' }),
    ]);
  });

  it('drops summaries of panels that are gone or now reference another item', async () => {
    const result = await withByRefPanels(
      {
        ...dashboard([{ ...piePanel, config: { savedObjectId: 'other-vis' } }]),
        _derived: {
          opaque_panels: [
            { panel_id: 'pie', saved_object_id: 'vis-1', resolved: true },
            { panel_id: 'removed', saved_object_id: 'vis-2', resolved: true },
          ],
        },
      },
      { savedObjectsClient, logger }
    );

    expect(result._derived?.opaque_panels).toEqual([
      expect.objectContaining({ panel_id: 'pie', saved_object_id: 'other-vis', resolved: false }),
    ]);
  });

  it('leaves dashboards without by-ref panels unchanged', async () => {
    const data = dashboard([
      { type: 'vis', id: 'by-value', config: { data_source: { type: 'esql' } }, grid },
    ]);

    const result = await withByRefPanels(
      {
        ...data,
        _derived: { opaque_panels: [{ panel_id: 'old', saved_object_id: 'x', resolved: true }] },
      },
      { savedObjectsClient, logger }
    );

    expect(bulkGet).not.toHaveBeenCalled();
    expect(result).toEqual(data);
  });

  it('keeps the dashboard valid when the saved objects cannot be read', async () => {
    bulkGet.mockRejectedValueOnce(new Error('cluster unavailable'));

    const result = await withByRefPanels(dashboard([piePanel]), { savedObjectsClient, logger });

    expect(result).toEqual(dashboard([piePanel]));
    expect(logger.warn).toHaveBeenCalled();
  });

  it('keeps existing summaries when new saved objects cannot be read', async () => {
    bulkGet.mockRejectedValueOnce(new Error('cluster unavailable'));
    const existing = { panel_id: 'pie', saved_object_id: 'vis-1', resolved: true, title: 'Kept' };
    const mapPanel = { type: 'map', id: 'map', config: { savedObjectId: 'map-1' }, grid };

    const result = await withByRefPanels(
      { ...dashboard([piePanel, mapPanel]), _derived: { opaque_panels: [existing] } },
      { savedObjectsClient, logger }
    );

    expect(result._derived?.opaque_panels).toEqual([existing]);
  });
});
