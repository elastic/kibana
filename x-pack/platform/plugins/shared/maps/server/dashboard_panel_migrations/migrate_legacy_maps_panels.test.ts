/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PanelTypeMigrationPanel } from '@kbn/embeddable-plugin/server';
import { migrateLegacyTileAndRegionMapPanels } from './migrate_legacy_maps_panels';

describe('migrateLegacyTileAndRegionMapPanels', () => {
  const savedObjectsClient = {
    bulkGet: jest.fn(),
  } as unknown as SavedObjectsClientContract;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('migrates a by-value tile_map panel to a map panel', async () => {
    const panels: readonly PanelTypeMigrationPanel[] = [
      {
        id: 'panel-1',
        config: {
          title: 'Panel title',
          savedVis: {
            type: 'tile_map',
            title: 'My tile map',
            params: {
              mapType: 'Scaled Circle Markers',
              colorSchema: 'Yellow to Red',
            },
            data: {
              searchSource: { index: 'data-view-1' },
              aggs: [
                { schema: 'metric', type: 'count', params: {} },
                { schema: 'segment', type: 'geohash_grid', params: { field: 'geo.coordinates' } },
              ],
            },
            uiState: {
              mapCenter: [42.0, -88.9],
              mapZoom: '5',
            },
          },
        },
      },
    ];

    const results = await migrateLegacyTileAndRegionMapPanels(panels, savedObjectsClient);
    expect(results).toHaveLength(1);

    const result = results[0] as any;
    expect(result.panelId).toBe('panel-1');
    expect(result.config.title).toBe('Panel title');
    expect(result.config.attributes.title).toBe('My tile map');
    expect(result.config.attributes.settings.projection).toBe('mercator');
    expect(result.config.attributes.center).toEqual({ lat: 42.0, lon: -88.9 });
    expect(result.config.attributes.zoom).toBe(5);
    expect(result.config.attributes.layers).toHaveLength(2);
    expect(result.config.attributes.layers[0].type).toBe('EMS_VECTOR_TILE');
    expect(result.config.attributes.layers[0].sourceDescriptor.type).toBe('EMS_TMS');
    expect(result.config.attributes.layers[0].sourceDescriptor.id).toBe('road_map');

    expect(result.config.attributes.layers[1].sourceDescriptor.indexPatternId).toBe('data-view-1');
    expect(result.config.attributes.layers[1].sourceDescriptor.geoField).toBe('geo.coordinates');
    expect(result.config.attributes.layers[1].style.type).toBe('VECTOR');
    expect(result.config.attributes.layers[1].style.properties.iconSize.type).toBe('DYNAMIC');
  });

  it('migrates a by-value region_map panel to a map panel', async () => {
    const panels: readonly PanelTypeMigrationPanel[] = [
      {
        id: 'panel-1',
        config: {
          savedVis: {
            type: 'region_map',
            title: 'My region map',
            params: {
              colorSchema: 'Yellow to Red',
              selectedLayer: { isEMS: true, id: 'world_countries' },
              selectedJoinField: { name: 'iso2' },
            },
            data: {
              searchSource: { index: 'data-view-1' },
              aggs: [
                { schema: 'metric', type: 'count', params: {} },
                { schema: 'segment', type: 'terms', params: { field: 'geo.src', size: 10 } },
              ],
            },
            uiState: {
              mapZoom: 2,
            },
          },
        },
      },
    ];

    const results = await migrateLegacyTileAndRegionMapPanels(panels, savedObjectsClient);
    expect(results).toHaveLength(1);

    const result = results[0] as any;
    expect(result.config.attributes.settings.projection).toBe('mercator');
    expect(result.config.attributes.layers).toHaveLength(2);
    expect(result.config.attributes.layers[0].type).toBe('EMS_VECTOR_TILE');
    expect(result.config.attributes.layers[0].sourceDescriptor.type).toBe('EMS_TMS');

    expect(result.config.attributes.layers[1].joins).toHaveLength(1);
    expect(result.config.attributes.layers[1].joins[0].leftField).toBe('iso2');
    expect(result.config.attributes.layers[1].joins[0].right.indexPatternId).toBe('data-view-1');
    expect(result.config.attributes.layers[1].joins[0].right.term).toBe('geo.src');
  });

  it('migrates a by-reference tile_map panel to a map panel', async () => {
    (savedObjectsClient.bulkGet as jest.Mock).mockResolvedValue({
      saved_objects: [
        {
          id: 'vis-1',
          type: 'visualization',
          attributes: {
            visState: JSON.stringify({
              title: 'Ref tile map',
              type: 'tile_map',
              params: { mapType: 'Heatmap', colorSchema: 'Yellow to Red' },
              aggs: [
                { schema: 'metric', type: 'count', params: {} },
                { schema: 'segment', type: 'geohash_grid', params: { field: 'geo.coordinates' } },
              ],
            }),
            uiStateJSON: JSON.stringify({ mapCenter: [1, 2], mapZoom: 3 }),
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({
                indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
              }),
            },
          },
          references: [
            {
              name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
              type: 'index-pattern',
              id: 'data-view-1',
            },
          ],
        },
      ],
    });

    const panels: readonly PanelTypeMigrationPanel[] = [
      {
        id: 'panel-1',
        config: { savedObjectId: 'vis-1' },
      },
    ];

    const results = await migrateLegacyTileAndRegionMapPanels(panels, savedObjectsClient);
    expect(results).toHaveLength(1);

    const result = results[0] as any;
    expect(result.panelId).toBe('panel-1');
    expect(result.config.attributes.settings.projection).toBe('mercator');
    expect(result.config.attributes.layers).toHaveLength(2);
    expect(result.config.attributes.layers[0].type).toBe('EMS_VECTOR_TILE');
    expect(result.config.attributes.layers[0].sourceDescriptor.type).toBe('EMS_TMS');
    expect(result.config.attributes.layers[1].type).toBe('HEATMAP');
    expect(result.config.attributes.layers[1].style.type).toBe('HEATMAP');
  });
});
