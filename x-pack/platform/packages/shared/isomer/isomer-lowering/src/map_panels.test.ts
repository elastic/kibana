/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapsPack } from '@kbn/isomer-primitives-maps';

import { corpusObjects } from './corpus.test_helpers';
import type { EsqlRequestOptions } from './esql_response';
import { basemapId, lowerMap, type LowerMapOptions, viewExtent } from './map_panels';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

const EMS_FILES = new Set([
  'world_countries',
  'usa_states',
  'france_departments',
  'uk_subdivisions',
]);
const EMS_STYLES = new Set([
  'road_map',
  'road_map_desaturated_v9',
  'dark_map_v9',
  'road_map_desaturated',
]);

const basemap = { zoom: 2, originX: 0, originY: 0, columns: 1, rows: 1, tiles: [] };

/** Answers each request with one bucket or hit in the shape Elasticsearch returns for it. */
const fakeSearch = (requests: Json[] = []) =>
  jest.fn(async (_index: string, body: Json) => {
    requests.push(body);
    const aggs = body.aggs ?? {};
    const metrics = (agg: Json) =>
      Object.fromEntries(
        Object.entries(agg.aggs ?? {}).map(([key, sub]: [string, any]) => [
          key,
          sub.percentiles
            ? { values: { [`${sub.percentiles.percents[0]}.0`]: 7 } }
            : sub.geo_centroid
            ? { location: { lat: 10, lon: 20 }, count: 3 }
            : { value: 7 },
        ])
      );
    if (aggs.join) {
      return {
        aggregations: { join: { buckets: [{ key: 'US', doc_count: 3, ...metrics(aggs.join) }] } },
      };
    }
    if (aggs.grid) {
      return {
        aggregations: {
          grid: { buckets: [{ key: '4/4/6', doc_count: 3, ...metrics(aggs.grid) }] },
        },
      };
    }
    if (aggs.destSplit) {
      const grid = aggs.destSplit.aggs.sourceGrid;
      return {
        aggregations: {
          destSplit: {
            buckets: [
              {
                key: '40.5, -73.9',
                doc_count: 3,
                sourceGrid: { buckets: [{ key: '4/4/6', doc_count: 3, ...metrics(grid) }] },
              },
            ],
          },
        },
      };
    }
    const hit = {
      _id: 'doc',
      fields: new Proxy({}, { get: () => [{ type: 'Point', coordinates: [20, 10] }] }),
    };
    if (aggs.entitySplit) {
      return {
        aggregations: {
          entitySplit: { buckets: [{ key: 'a', entityHits: { hits: { hits: [hit] } } }] },
        },
      };
    }
    if (body.size === 0) {
      return { hits: { total: { value: 1 }, hits: [] } };
    }
    return { hits: { hits: [hit] } };
  });

const options = (map: Json, overrides: Partial<LowerMapOptions> = {}): LowerMapOptions => {
  const mapState = JSON.parse(map.attributes.mapStateJSON ?? '{}');
  return {
    map,
    view: {
      lat: mapState.center?.lat ?? 0,
      lon: mapState.center?.lon ?? 0,
      zoom: mapState.zoom ?? 2,
    },
    size: { width: 600, height: 400 },
    dataView: () => ({ index: 'idx', timeField: '@timestamp' }),
    timeRange: { from: '2026-10-01T00:00:00.000Z', to: '2026-10-11T00:00:00.000Z' },
    search: fakeSearch(),
    executeEsql: jest.fn(async () => ({
      columns: [{ name: 'location', type: 'geo_point' }],
      values: [['POINT (20 10)']],
    })),
    services: {
      loadBoundary: async (id) => EMS_FILES.has(id),
      basemap: async (id) => (EMS_STYLES.has(id) ? basemap : undefined),
    },
    ...overrides,
  };
};

const mapOf = (layers: Json[], mapState: Json = { center: { lat: 0, lon: 0 }, zoom: 2 }): Json => ({
  type: 'map',
  id: 'm',
  attributes: { layerListJSON: JSON.stringify(layers), mapStateJSON: JSON.stringify(mapState) },
  references: [],
});

const mapSchema = mapsPack.primitives.find(({ type }) => type === 'map')!.schema;

describe('lowerMap', () => {
  it('colors an EMS boundary file by its join metric, keyed on the join’s left field', async () => {
    const requests: Json[] = [];
    const lowered = await lowerMap(
      options(
        mapOf([
          {
            id: 'l',
            type: 'GEOJSON_VECTOR',
            alpha: 0.5,
            sourceDescriptor: { type: 'EMS_FILE', id: 'usa_states' },
            joins: [
              {
                leftField: 'name',
                right: {
                  id: 'r',
                  type: 'ES_TERM_SOURCE',
                  term: 'geoip.region_name',
                  indexPatternRefName: 'dv',
                  metrics: [{ type: 'count' }, { type: 'avg', field: 'price' }],
                  whereQuery: { query: 'a:b', language: 'kuery' },
                },
              },
            ],
            style: {
              properties: {
                fillColor: {
                  type: 'DYNAMIC',
                  options: {
                    color: 'Greens',
                    field: { name: '__kbnjoin__avg_of_price__r', origin: 'join' },
                  },
                },
              },
            },
          },
        ]),
        { search: fakeSearch(requests) }
      )
    );
    expect(lowered.refused).toEqual([]);
    expect(lowered.node?.layers).toEqual([
      {
        kind: 'regions',
        regionSet: 'usa_states',
        regionKey: 'name',
        regionRamp: 'greens',
        regions: [{ code: 'US', value: 7 }],
        opacity: 0.5,
      },
    ]);
    // The join's own where-query applies with the global time, as Kibana's term source sends them.
    expect(requests[0].aggs.join).toEqual({
      terms: { field: 'geoip.region_name', size: 65535, shard_size: 65535 },
      aggs: { avg_of_price: { avg: { field: 'price' } } },
    });
    expect(JSON.stringify(requests[0].query)).toContain('"range"');
    expect(JSON.stringify(requests[0].query)).toContain('"a":"b"');
  });

  it('draws grid points, cells and heatmaps at Kibana’s geotile precision, inside the view grown to whole tiles', async () => {
    const requests: Json[] = [];
    const layer = (requestType: string, resolution: string) => ({
      id: requestType,
      type: 'GEOJSON_VECTOR',
      sourceDescriptor: {
        type: 'ES_GEO_GRID',
        requestType,
        resolution,
        geoField: 'loc',
        indexPatternRefName: 'dv',
        metrics: [{ type: 'percentile', field: 'delay', percentile: 95 }],
      },
      style: { properties: {} },
    });
    const lowered = await lowerMap(
      options(
        mapOf([layer('heatmap', 'FINE'), layer('grid', 'MOST_FINE'), layer('point', 'COARSE')], {
          center: { lat: 0, lon: 0 },
          zoom: 2.3,
        }),
        { search: fakeSearch(requests) }
      )
    );
    expect(requests.map(({ aggs }) => aggs.grid.geotile_grid.precision)).toEqual([6, 7, 5]);
    expect(lowered.node?.layers?.map((stacked) => stacked.kind)).toEqual([
      'cells',
      'cells',
      'markers',
    ]);
    expect(lowered.node?.layers?.[0]).toMatchObject({
      cellShape: 'heatmap',
      cells: [{ key: '4/4/6', value: 7 }],
    });
    const box = requests[2].query.bool.filter[0].geo_bounding_box.loc;
    const view = viewExtent({ lat: 0, lon: 0, zoom: 2.3 }, { width: 600, height: 400 });
    expect(box.top_left.lon).toBeLessThanOrEqual(view.minLon);
    expect(box.bottom_right.lon).toBeGreaterThanOrEqual(view.maxLon);
  });

  it('labels clusters as Kibana formats them: a metric by its source field’s format, a count by the default', async () => {
    const cluster = (labelField: string) =>
      mapOf([
        {
          id: 'g',
          type: 'GEOJSON_VECTOR',
          sourceDescriptor: {
            type: 'ES_GEO_GRID',
            requestType: 'point',
            geoField: 'loc',
            indexPatternRefName: 'dv',
            metrics: [{ type: 'count' }, { type: 'sum', field: 'price' }],
          },
          style: {
            properties: {
              labelText: { type: 'DYNAMIC', options: { field: { name: labelField } } },
            },
          },
        },
      ]);
    const dataView = () => ({
      index: 'idx',
      fieldFormats: { price: { id: 'number', params: { pattern: '$0,0.[00]' } } },
    });
    const labelOf = async (field: string) => {
      const { node } = await lowerMap(options(cluster(field), { dataView }));
      const [layer] = node?.layers ?? [];
      return layer?.kind === 'markers' ? layer.markers[0].label : undefined;
    };
    expect(await labelOf('sum_of_price')).toBe('$7.00');
    expect(await labelOf('doc_count')).toBe('3');
  });

  it('paints a layer’s outline, icon size and labels as its vector style sets them', async () => {
    const { node, notes } = await lowerMap(
      options(
        mapOf([
          {
            id: 'd',
            label: 'Docs',
            type: 'GEOJSON_VECTOR',
            sourceDescriptor: { type: 'ES_SEARCH', geoField: 'loc', indexPatternRefName: 'dv' },
            style: {
              properties: {
                lineColor: { type: 'STATIC', options: { color: '#3d3d3d' } },
                lineWidth: { type: 'STATIC', options: { size: 2 } },
                iconSize: { type: 'STATIC', options: { size: 9 } },
                labelText: { type: 'STATIC', options: { value: 'Origin' } },
                labelColor: { type: 'STATIC', options: { color: '#000000' } },
                labelSize: { type: 'STATIC', options: { size: 14 } },
                symbolizeAs: { options: { value: 'icon' } },
                icon: { type: 'STATIC', options: { value: 'airport' } },
              },
            },
          },
        ])
      )
    );
    expect(node?.layers?.[0]).toMatchObject({
      kind: 'markers',
      lineColor: '#3d3d3d',
      lineWidth: 2,
      markerSize: { min: 9, max: 9 },
      labelColor: '#000000',
      labelSize: 14,
      markerLabels: 'inside',
      markers: [{ label: 'Origin' }],
    });
    expect(notes).toEqual(['Docs (GEOJSON_VECTOR/ES_SEARCH): the airport icon draws as a circle']);
  });

  it('refuses a layer it can’t draw by name, and the whole map with it', async () => {
    const lowered = await lowerMap(
      options(
        mapOf([
          {
            id: 'b',
            type: 'EMS_VECTOR_TILE',
            sourceDescriptor: { type: 'EMS_TMS', isAutoSelect: true },
          },
          {
            id: 'h',
            label: 'Hexes',
            type: 'GEOJSON_VECTOR',
            sourceDescriptor: { type: 'ES_GEO_GRID', requestType: 'hex', geoField: 'loc' },
          },
        ])
      )
    );
    expect(lowered.node).toBeUndefined();
    expect(lowered.refused).toEqual([
      'Hexes (GEOJSON_VECTOR/ES_GEO_GRID): H3 hexagons; the map draws geotile cells',
    ]);
  });

  it('refuses more documents than a map draws markers, rather than drawing some of them', async () => {
    const search = jest.fn(async () => ({ hits: { total: { value: 151 }, hits: [] } }));
    const lowered = await lowerMap(
      options(
        mapOf([
          {
            id: 'd',
            label: 'Docs',
            type: 'GEOJSON_VECTOR',
            sourceDescriptor: { type: 'ES_SEARCH', geoField: 'loc', indexPatternRefName: 'dv' },
          },
        ]),
        { search }
      )
    );
    expect(lowered.refused).toEqual([
      'Docs (GEOJSON_VECTOR/ES_SEARCH): 151 documents exceed the 150 markers a map draws',
    ]);
  });

  it('narrows an ES|QL layer as Kibana does: global search, time, map bounds, and ?_tstart', async () => {
    const executeEsql = jest.fn(async (_esql: string, _options?: EsqlRequestOptions) => ({
      columns: [{ name: 'location', type: 'geo_point' }],
      values: [['POINT (20 10)']],
    }));
    const lowered = await lowerMap(
      options(
        mapOf([
          {
            id: 'e',
            type: 'GEOJSON_VECTOR',
            sourceDescriptor: {
              type: 'ESQL',
              esql: 'FROM logs | WHERE @timestamp >= ?_tstart',
              geoField: 'location',
              dateField: '@timestamp',
            },
          },
        ]),
        { executeEsql, context: { filter: [{ term: { a: 1 } }] } }
      )
    );
    expect(lowered.node?.layers?.[0]).toMatchObject({
      kind: 'markers',
      markers: [{ lat: 10, lon: 20 }],
    });
    const [, sent] = executeEsql.mock.calls[0];
    expect(JSON.stringify(sent?.filter)).toContain('geo_bounding_box');
    expect(JSON.stringify(sent?.filter)).toContain('"term":{"a":1}');
    expect(sent?.params).toEqual([{ _tstart: '2026-10-01T00:00:00.000Z' }]);
  });

  it('picks the basemap as Kibana does: the saved style, else by theme', () => {
    expect(basemapId({ id: 'road_map', isAutoSelect: false })).toBe('road_map');
    expect(basemapId({ isAutoSelect: true }, true)).toBe('dark_map_v9');
    expect(basemapId({ isAutoSelect: true, lightModeDefault: 'road_map' })).toBe('road_map');
    expect(basemapId({ isAutoSelect: true })).toBe('road_map_desaturated_v9');
  });
});

describe('lowerMap over the repository’s saved maps', () => {
  const maps = corpusObjects(['map'], 'layerListJSON');

  // Recorded 2026-10-21: 41 maps. A drop means the corpus walk broke; a rise is welcome.
  it('finds the corpus', () => {
    expect(maps.length).toBeGreaterThanOrEqual(41);
  });

  // Every refusal is one of these, by name. A new kind of layer fails here until it's lowered or refused on purpose.
  const KNOWN_REFUSALS = [
    /no lowering for a (KIBANA_TILEMAP|ES_GEO_LINE|ES_ML_ANOMALIES|MVT_SINGLE_LAYER|WMS|EMS_XYZ|GEOJSON_FILE|TABLE_SOURCE|missing) source$/,
    /H3 hexagons; the map draws geotile cells$/,
    /the \w+ boundaries are not in EMS$/,
    /boundaries without a join draw no data$/,
    /documents with a join$/,
    /a ES_DISTANCE_SOURCE join$/,
    /a second basemap over the first$/,
  ];

  it('lowers every layer at a zoom it shows at, or refuses it by name', async () => {
    const tally: Record<string, number> = {};
    for (const map of maps) {
      const layers = JSON.parse(String(map.attributes.layerListJSON ?? '[]')) as Json[];
      for (const layer of layers) {
        const zoom = Math.min(Math.max(2, layer.minZoom ?? 0), layer.maxZoom ?? 24);
        const single = mapOf([{ ...layer, visible: true }], { center: { lat: 20, lon: 0 }, zoom });
        const lowered = await lowerMap(options(single));
        const kind = `${layer.type}/${layer.sourceDescriptor?.type}`;
        if (lowered.node) {
          expect(mapSchema.safeParse({ ...lowered.node, id: 'p' }).success).toBe(true);
          tally[`drawn ${kind}`] = (tally[`drawn ${kind}`] ?? 0) + 1;
        } else {
          const unexplained = [...lowered.refused, ...lowered.notes].filter(
            (reason) =>
              !KNOWN_REFUSALS.some((known) => known.test(reason)) && !/stand in$/.test(reason)
          );
          expect({ file: map.file, id: map.id, kind, unexplained }).toEqual({
            file: map.file,
            id: map.id,
            kind,
            unexplained: [],
          });
          tally[`refused ${kind}`] = (tally[`refused ${kind}`] ?? 0) + 1;
        }
      }
    }
    // Recorded 2026-10-21: 72 of 78 layers drawn, across 15 layer and source kinds.
    const drawn = Object.entries(tally).filter(([key]) => key.startsWith('drawn'));
    expect(drawn.length).toBeGreaterThanOrEqual(15);
    expect(drawn.reduce((sum, [, count]) => sum + count, 0)).toBeGreaterThanOrEqual(72);
  });
});
