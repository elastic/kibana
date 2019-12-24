/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/new_platform');
jest.mock('ui/index_patterns');
jest.mock('./kibana_services', () => {
  return {
    SPATIAL_FILTER_TYPE: 'spatial_filter',
  };
});

import {
  hitsToGeoJson,
  geoPointToGeometry,
  geoShapeToGeometry,
  createExtentFilter,
  convertMapExtentToPolygon,
  roundCoordinates,
} from './elasticsearch_geo_utils';
import { flattenHitWrapper } from 'ui/index_patterns';

const geoFieldName = 'location';
const mapExtent = {
  maxLat: 39,
  maxLon: -83,
  minLat: 35,
  minLon: -89,
};

const flattenHitMock = hit => {
  const properties = {};
  for (const fieldName in hit._source) {
    if (hit._source.hasOwnProperty(fieldName)) {
      properties[fieldName] = hit._source[fieldName];
    }
  }
  for (const fieldName in hit.fields) {
    if (hit.fields.hasOwnProperty(fieldName)) {
      properties[fieldName] = hit.fields[fieldName];
    }
  }
  properties._id = hit._id;
  properties._index = hit._index;

  return properties;
};

describe('hitsToGeoJson', () => {
  it('Should convert elasitcsearch hits to geojson', () => {
    const hits = [
      {
        _id: 'doc1',
        _index: 'index1',
        fields: {
          [geoFieldName]: '20,100',
        },
      },
      {
        _id: 'doc2',
        _index: 'index1',
        _source: {
          [geoFieldName]: '30,110',
        },
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_point');
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(2);
    expect(geojson.features[0]).toEqual({
      geometry: {
        coordinates: [100, 20],
        type: 'Point',
      },
      id: 'index1:doc1:0',
      properties: {
        _id: 'doc1',
        _index: 'index1',
      },
      type: 'Feature',
    });
  });

  it('Should handle documents where geoField is not populated', () => {
    const hits = [
      {
        _source: {
          [geoFieldName]: '20,100',
        },
      },
      {
        _source: {},
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_point');
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(1);
  });

  it('Should populate properties from hit', () => {
    const hits = [
      {
        _source: {
          [geoFieldName]: '20,100',
          myField: 8,
        },
        fields: {
          myScriptedField: 10,
        },
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_point');
    expect(geojson.features.length).toBe(1);
    const feature = geojson.features[0];
    expect(feature.properties.myField).toBe(8);
  });

  it('Should create feature per item when geometry value is an array', () => {
    const hits = [
      {
        _id: 'doc1',
        _index: 'index1',
        _source: {
          [geoFieldName]: ['20,100', '30,110'],
          myField: 8,
        },
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_point');
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(2);
    expect(geojson.features[0]).toEqual({
      geometry: {
        coordinates: [100, 20],
        type: 'Point',
      },
      id: 'index1:doc1:0',
      properties: {
        _id: 'doc1',
        _index: 'index1',
        myField: 8,
      },
      type: 'Feature',
    });
    expect(geojson.features[1]).toEqual({
      geometry: {
        coordinates: [110, 30],
        type: 'Point',
      },
      id: 'index1:doc1:1',
      properties: {
        _id: 'doc1',
        _index: 'index1',
        myField: 8,
      },
      type: 'Feature',
    });
  });

  describe('dot in geoFieldName', () => {
    const indexPatternMock = {
      fields: {
        getByName: name => {
          const fields = {
            ['my.location']: {
              type: 'geo_point',
            },
          };
          return fields[name];
        },
      },
    };
    const indexPatternFlattenHit = flattenHitWrapper(indexPatternMock);

    it('Should handle geoField being an object', () => {
      const hits = [
        {
          _source: {
            my: {
              location: '20,100',
            },
          },
        },
      ];
      const geojson = hitsToGeoJson(hits, indexPatternFlattenHit, 'my.location', 'geo_point');
      expect(geojson.features[0].geometry).toEqual({
        coordinates: [100, 20],
        type: 'Point',
      });
    });

    it('Should handle geoField containing dot in the name', () => {
      const hits = [
        {
          _source: {
            ['my.location']: '20,100',
          },
        },
      ];
      const geojson = hitsToGeoJson(hits, indexPatternFlattenHit, 'my.location', 'geo_point');
      expect(geojson.features[0].geometry).toEqual({
        coordinates: [100, 20],
        type: 'Point',
      });
    });
  });
});

describe('geoPointToGeometry', () => {
  const lat = 41.12;
  const lon = -71.34;

  it('Should convert single docvalue_field', () => {
    const value = `${lat},${lon}`;
    const points = [];
    geoPointToGeometry(value, points);
    expect(points.length).toBe(1);
    expect(points[0].type).toBe('Point');
    expect(points[0].coordinates).toEqual([lon, lat]);
  });

  it('Should convert multiple docvalue_fields', () => {
    const lat2 = 30;
    const lon2 = -60;
    const value = [`${lat},${lon}`, `${lat2},${lon2}`];
    const points = [];
    geoPointToGeometry(value, points);
    expect(points.length).toBe(2);
    expect(points[0].coordinates).toEqual([lon, lat]);
    expect(points[1].coordinates).toEqual([lon2, lat2]);
  });
});

describe('geoShapeToGeometry', () => {
  it('Should convert value stored as geojson', () => {
    const coordinates = [
      [-77.03653, 38.897676],
      [-77.009051, 38.889939],
    ];
    const value = {
      type: 'linestring',
      coordinates: coordinates,
    };
    const shapes = [];
    geoShapeToGeometry(value, shapes);
    expect(shapes.length).toBe(1);
    expect(shapes[0].type).toBe('LineString');
    expect(shapes[0].coordinates).toEqual(coordinates);
  });

  it('Should convert array of values', () => {
    const linestringCoordinates = [
      [-77.03653, 38.897676],
      [-77.009051, 38.889939],
    ];
    const pointCoordinates = [125.6, 10.1];
    const value = [
      {
        type: 'linestring',
        coordinates: linestringCoordinates,
      },
      {
        type: 'point',
        coordinates: pointCoordinates,
      },
    ];
    const shapes = [];
    geoShapeToGeometry(value, shapes);
    expect(shapes.length).toBe(2);
    expect(shapes[0].type).toBe('LineString');
    expect(shapes[0].coordinates).toEqual(linestringCoordinates);
    expect(shapes[1].type).toBe('Point');
    expect(shapes[1].coordinates).toEqual(pointCoordinates);
  });

  it('Should convert wkt shapes to geojson', () => {
    const pointWkt = 'POINT (32 40)';
    const linestringWkt = 'LINESTRING (50 60, 70 80)';

    const shapes = [];
    geoShapeToGeometry(pointWkt, shapes);
    geoShapeToGeometry(linestringWkt, shapes);

    expect(shapes.length).toBe(2);
    expect(shapes[0]).toEqual({
      coordinates: [32, 40],
      type: 'Point',
    });
    expect(shapes[1]).toEqual({
      coordinates: [
        [50, 60],
        [70, 80],
      ],
      type: 'LineString',
    });
  });
});

describe('createExtentFilter', () => {
  it('should return elasticsearch geo_bounding_box filter for geo_point field', () => {
    const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_point');
    expect(filter).toEqual({
      geo_bounding_box: {
        location: {
          bottom_right: [-83, 35],
          top_left: [-89, 39],
        },
      },
    });
  });

  it('should return elasticsearch geo_shape filter for geo_shape field', () => {
    const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_shape');
    expect(filter).toEqual({
      geo_shape: {
        location: {
          relation: 'INTERSECTS',
          shape: {
            coordinates: [
              [
                [-89, 39],
                [-89, 35],
                [-83, 35],
                [-83, 39],
                [-89, 39],
              ],
            ],
            type: 'Polygon',
          },
        },
      },
    });
  });

  it('should clamp longitudes to -180 to 180', () => {
    const mapExtent = {
      maxLat: 39,
      maxLon: 209,
      minLat: 35,
      minLon: -191,
    };
    const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_shape');
    expect(filter).toEqual({
      geo_shape: {
        location: {
          relation: 'INTERSECTS',
          shape: {
            coordinates: [
              [
                [-180, 39],
                [-180, 35],
                [180, 35],
                [180, 39],
                [-180, 39],
              ],
            ],
            type: 'Polygon',
          },
        },
      },
    });
  });
});

describe('convertMapExtentToPolygon', () => {
  it('should convert bounds to envelope', () => {
    const bounds = {
      maxLat: 10,
      maxLon: 100,
      minLat: -10,
      minLon: 90,
    };
    expect(convertMapExtentToPolygon(bounds)).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [90, 10],
          [90, -10],
          [100, -10],
          [100, 10],
          [90, 10],
        ],
      ],
    });
  });

  it('should clamp longitudes to -180 to 180', () => {
    const bounds = {
      maxLat: 10,
      maxLon: 200,
      minLat: -10,
      minLon: -400,
    };
    expect(convertMapExtentToPolygon(bounds)).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [-180, 10],
          [-180, -10],
          [180, -10],
          [180, 10],
          [-180, 10],
        ],
      ],
    });
  });

  it('should clamp longitudes to -180 to 180 when bounds span entire globe (360)', () => {
    const bounds = {
      maxLat: 10,
      maxLon: 170,
      minLat: -10,
      minLon: -400,
    };
    expect(convertMapExtentToPolygon(bounds)).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [-180, 10],
          [-180, -10],
          [180, -10],
          [180, 10],
          [-180, 10],
        ],
      ],
    });
  });

  it('should handle bounds that cross dateline(east to west)', () => {
    const bounds = {
      maxLat: 10,
      maxLon: 190,
      minLat: -10,
      minLon: 170,
    };
    expect(convertMapExtentToPolygon(bounds)).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [170, 10],
          [170, -10],
          [-170, -10],
          [-170, 10],
          [170, 10],
        ],
      ],
    });
  });

  it('should handle bounds that cross dateline(west to east)', () => {
    const bounds = {
      maxLat: 10,
      maxLon: -170,
      minLat: -10,
      minLon: -190,
    };
    expect(convertMapExtentToPolygon(bounds)).toEqual({
      type: 'Polygon',
      coordinates: [
        [
          [170, 10],
          [170, -10],
          [-170, -10],
          [-170, 10],
          [170, 10],
        ],
      ],
    });
  });
});

describe('roundCoordinates', () => {
  it('should set coordinates precision', () => {
    const coordinates = [
      [110.21515290475513, 40.23193047044205],
      [-105.30620093073654, 40.23193047044205],
      [-105.30620093073654, 30.647128842617803],
    ];
    roundCoordinates(coordinates);
    expect(coordinates).toEqual([
      [110.21515, 40.23193],
      [-105.3062, 40.23193],
      [-105.3062, 30.64713],
    ]);
  });
});
