/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Polygon } from 'geojson';
import { DataViewBase } from '@kbn/es-query';
import {
  createDistanceFilterWithMeta,
  createExtentFilter,
  buildGeoGridFilter,
  buildGeoShapeFilter,
  extractFeaturesFromFilters,
} from './spatial_filter_utils';
import { buildQueryFromFilters } from '@kbn/es-query';

const geoFieldName = 'location';

describe('buildQueryFromFilters', () => {
  it('should not drop spatial filters when ignoreFilterIfFieldNotInIndex is true', () => {
    const query = buildQueryFromFilters(
      [
        createDistanceFilterWithMeta({
          point: [100, 30],
          distanceKm: 1000,
          geoFieldNames: ['geo.coordinates'],
        }),
        createDistanceFilterWithMeta({
          point: [120, 30],
          distanceKm: 1000,
          geoFieldNames: ['geo.coordinates', 'location'],
        }),
      ],
      {
        id: 'myDataViewWithoutAnyMacthingFields',
        fields: [],
      } as unknown as DataViewBase,
      { ignoreFilterIfFieldNotInIndex: true }
    );
    expect(query.filter.length).toBe(2);
  });
});

describe('createExtentFilter', () => {
  it('should return elasticsearch geo_bounding_box filter', () => {
    const mapExtent = {
      maxLat: 39,
      maxLon: -83,
      minLat: 35,
      minLon: -89,
    };
    expect(createExtentFilter(mapExtent, [geoFieldName])).toEqual({
      meta: {
        alias: null,
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'location',
              },
            },
            {
              geo_bounding_box: {
                location: {
                  top_left: [-89, 39],
                  bottom_right: [-83, 35],
                },
              },
            },
          ],
        },
      },
    });
  });

  it('should clamp longitudes to -180 to 180 and latitudes to -90 to 90', () => {
    const mapExtent = {
      maxLat: 120,
      maxLon: 200,
      minLat: -100,
      minLon: -190,
    };
    expect(createExtentFilter(mapExtent, [geoFieldName])).toEqual({
      meta: {
        alias: null,
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'location',
              },
            },
            {
              geo_bounding_box: {
                location: {
                  top_left: [-180, 89],
                  bottom_right: [180, -89],
                },
              },
            },
          ],
        },
      },
    });
  });

  it('should make left longitude greater than right longitude when area crosses 180 meridian east to west', () => {
    const mapExtent = {
      maxLat: 39,
      maxLon: 200,
      minLat: 35,
      minLon: 100,
    };
    expect(createExtentFilter(mapExtent, [geoFieldName])).toEqual({
      meta: {
        alias: null,
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'location',
              },
            },
            {
              geo_bounding_box: {
                location: {
                  top_left: [100, 39],
                  bottom_right: [-160, 35],
                },
              },
            },
          ],
        },
      },
    });
  });

  it('should make left longitude greater than right longitude when area crosses 180 meridian west to east', () => {
    const mapExtent = {
      maxLat: 39,
      maxLon: -100,
      minLat: 35,
      minLon: -200,
    };
    expect(createExtentFilter(mapExtent, [geoFieldName])).toEqual({
      meta: {
        alias: null,
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'location',
              },
            },
            {
              geo_bounding_box: {
                location: {
                  top_left: [160, 39],
                  bottom_right: [-100, 35],
                },
              },
            },
          ],
        },
      },
    });
  });

  it('should clamp longitudes to -180 to 180 when longitude wraps globe', () => {
    const mapExtent = {
      maxLat: 39,
      maxLon: 209,
      minLat: 35,
      minLon: -191,
    };
    expect(createExtentFilter(mapExtent, [geoFieldName])).toEqual({
      meta: {
        alias: null,
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'location',
              },
            },
            {
              geo_bounding_box: {
                location: {
                  top_left: [-180, 39],
                  bottom_right: [180, 35],
                },
              },
            },
          ],
        },
      },
    });
  });

  it('should support multiple geo fields', () => {
    const mapExtent = {
      maxLat: 39,
      maxLon: -83,
      minLat: 35,
      minLon: -89,
    };
    expect(createExtentFilter(mapExtent, [geoFieldName, 'myOtherLocation'])).toEqual({
      meta: {
        alias: null,
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'location',
                    },
                  },
                  {
                    geo_bounding_box: {
                      location: {
                        top_left: [-89, 39],
                        bottom_right: [-83, 35],
                      },
                    },
                  },
                ],
              },
            },
            {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'myOtherLocation',
                    },
                  },
                  {
                    geo_bounding_box: {
                      myOtherLocation: {
                        top_left: [-89, 39],
                        bottom_right: [-83, 35],
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });
});

describe('buildGeoGridFilter', () => {
  it('should build filter for single field', () => {
    const spatialFilter = buildGeoGridFilter({
      geoFieldNames: ['geo.coordinates'],
      gridId: '9/146/195',
      isHex: false,
    });
    expect(spatialFilter).toEqual({
      meta: {
        alias: 'intersects cluster 9/146/195',
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'geo.coordinates',
              },
            },
            {
              geo_grid: {
                'geo.coordinates': {
                  geotile: '9/146/195',
                },
              },
            },
          ],
        },
      },
    });
  });

  it('should build filter for multiple field', () => {
    const spatialFilter = buildGeoGridFilter({
      geoFieldNames: ['geo.coordinates', 'location'],
      gridId: '822af7fffffffff',
      isHex: true,
    });
    expect(spatialFilter).toEqual({
      meta: {
        alias: 'intersects cluster 822af7fffffffff',
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'geo.coordinates',
                    },
                  },
                  {
                    geo_grid: {
                      'geo.coordinates': {
                        geohex: '822af7fffffffff',
                      },
                    },
                  },
                ],
              },
            },
            {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'location',
                    },
                  },
                  {
                    geo_grid: {
                      location: {
                        geohex: '822af7fffffffff',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });
});

describe('buildGeoShapeFilter', () => {
  it('should build filter for single field', () => {
    const spatialFilter = buildGeoShapeFilter({
      geometry: {
        coordinates: [
          [
            [-101.21639, 48.1413],
            [-101.21639, 41.84905],
            [-90.95149, 41.84905],
            [-90.95149, 48.1413],
            [-101.21639, 48.1413],
          ],
        ],
        type: 'Polygon',
      },
      geometryLabel: 'myShape',
      geoFieldNames: ['geo.coordinates'],
    });
    expect(spatialFilter).toEqual({
      meta: {
        alias: 'intersects myShape',
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'geo.coordinates',
              },
            },
            {
              geo_shape: {
                'geo.coordinates': {
                  relation: 'intersects',
                  shape: {
                    coordinates: [
                      [
                        [-101.21639, 48.1413],
                        [-101.21639, 41.84905],
                        [-90.95149, 41.84905],
                        [-90.95149, 48.1413],
                        [-101.21639, 48.1413],
                      ],
                    ],
                    type: 'Polygon',
                  },
                },
                ignore_unmapped: true,
              },
            },
          ],
        },
      },
    });
  });

  it('should build filter for multiple field', () => {
    const spatialFilter = buildGeoShapeFilter({
      geometry: {
        coordinates: [
          [
            [-101.21639, 48.1413],
            [-101.21639, 41.84905],
            [-90.95149, 41.84905],
            [-90.95149, 48.1413],
            [-101.21639, 48.1413],
          ],
        ],
        type: 'Polygon',
      },
      geometryLabel: 'myShape',
      geoFieldNames: ['geo.coordinates', 'location'],
    });
    expect(spatialFilter).toEqual({
      meta: {
        alias: 'intersects myShape',
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'geo.coordinates',
                    },
                  },
                  {
                    geo_shape: {
                      'geo.coordinates': {
                        relation: 'intersects',
                        shape: {
                          coordinates: [
                            [
                              [-101.21639, 48.1413],
                              [-101.21639, 41.84905],
                              [-90.95149, 41.84905],
                              [-90.95149, 48.1413],
                              [-101.21639, 48.1413],
                            ],
                          ],
                          type: 'Polygon',
                        },
                      },
                      ignore_unmapped: true,
                    },
                  },
                ],
              },
            },
            {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'location',
                    },
                  },
                  {
                    geo_shape: {
                      location: {
                        relation: 'intersects',
                        shape: {
                          coordinates: [
                            [
                              [-101.21639, 48.1413],
                              [-101.21639, 41.84905],
                              [-90.95149, 41.84905],
                              [-90.95149, 48.1413],
                              [-101.21639, 48.1413],
                            ],
                          ],
                          type: 'Polygon',
                        },
                      },
                      ignore_unmapped: true,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });
});

describe('createDistanceFilterWithMeta', () => {
  it('should build filter for single field', () => {
    const spatialFilter = createDistanceFilterWithMeta({
      point: [120, 30],
      distanceKm: 1000,
      geoFieldNames: ['geo.coordinates'],
    });
    expect(spatialFilter).toEqual({
      meta: {
        alias: 'within 1000km of 120, 30',
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'geo.coordinates',
              },
            },
            {
              geo_distance: {
                distance: '1000km',
                'geo.coordinates': [120, 30],
              },
            },
          ],
        },
      },
    });
  });

  it('should build filter for multiple field', () => {
    const spatialFilter = createDistanceFilterWithMeta({
      point: [120, 30],
      distanceKm: 1000,
      geoFieldNames: ['geo.coordinates', 'location'],
    });
    expect(spatialFilter).toEqual({
      meta: {
        alias: 'within 1000km of 120, 30',
        disabled: false,
        isMultiIndex: true,
        negate: false,
        type: 'spatial_filter',
      },
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'geo.coordinates',
                    },
                  },
                  {
                    geo_distance: {
                      distance: '1000km',
                      'geo.coordinates': [120, 30],
                    },
                  },
                ],
              },
            },
            {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'location',
                    },
                  },
                  {
                    geo_distance: {
                      distance: '1000km',
                      location: [120, 30],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
  });
});

describe('extractFeaturesFromFilters', () => {
  it('should ignore non-spatial filers', () => {
    const phraseFilter = {
      meta: {
        alias: null,
        disabled: false,
        index: '90943e30-9a47-11e8-b64d-95841ca0b247',
        key: 'machine.os',
        negate: false,
        params: {
          query: 'ios',
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          'machine.os': 'ios',
        },
      },
    };
    expect(extractFeaturesFromFilters([phraseFilter])).toEqual([]);
  });

  it('should ignore malformed spatial filers', () => {
    expect(
      extractFeaturesFromFilters([
        {
          meta: {
            type: 'spatial_filter',
          },
          query: {
            bool: {
              must: [],
            },
          },
        },
      ])
    ).toEqual([]);
    expect(
      extractFeaturesFromFilters([
        {
          meta: {
            type: 'spatial_filter',
          },
          query: {
            bool: {
              should: [],
            },
          },
        },
      ])
    ).toEqual([]);
  });

  it('should convert single field geo_distance filter to feature', () => {
    const spatialFilter = createDistanceFilterWithMeta({
      point: [-89.87125, 53.49454],
      distanceKm: 1096,
      geoFieldNames: ['geo.coordinates', 'location'],
    });

    const features = extractFeaturesFromFilters([spatialFilter]);
    expect((features[0].geometry as Polygon).coordinates[0][0]).toEqual([
      -89.87125, 63.35109118642093,
    ]);
    expect(features[0].properties).toEqual({
      filter: 'within 1096km of -89.87125, 53.49454',
    });
  });

  it('should convert multi field geo_distance filter to feature', () => {
    const spatialFilter = createDistanceFilterWithMeta({
      point: [-89.87125, 53.49454],
      distanceKm: 1096,
      geoFieldNames: ['geo.coordinates', 'location'],
    });

    const features = extractFeaturesFromFilters([spatialFilter]);
    expect((features[0].geometry as Polygon).coordinates[0][0]).toEqual([
      -89.87125, 63.35109118642093,
    ]);
    expect(features[0].properties).toEqual({
      filter: 'within 1096km of -89.87125, 53.49454',
    });
  });

  it('should convert single field geo_shape filter to feature', () => {
    const spatialFilter = buildGeoShapeFilter({
      geometry: {
        coordinates: [
          [
            [-101.21639, 48.1413],
            [-101.21639, 41.84905],
            [-90.95149, 41.84905],
            [-90.95149, 48.1413],
            [-101.21639, 48.1413],
          ],
        ],
        type: 'Polygon',
      },
      geometryLabel: 'myShape',
      geoFieldNames: ['geo.coordinates'],
    });
    expect(extractFeaturesFromFilters([spatialFilter])).toEqual([
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-101.21639, 48.1413],
              [-101.21639, 41.84905],
              [-90.95149, 41.84905],
              [-90.95149, 48.1413],
              [-101.21639, 48.1413],
            ],
          ],
        } as Polygon,
        properties: {
          filter: 'intersects myShape',
        },
      },
    ]);
  });

  it('should convert multi field geo_shape filter to feature', () => {
    const spatialFilter = buildGeoShapeFilter({
      geometry: {
        coordinates: [
          [
            [-101.21639, 48.1413],
            [-101.21639, 41.84905],
            [-90.95149, 41.84905],
            [-90.95149, 48.1413],
            [-101.21639, 48.1413],
          ],
        ],
        type: 'Polygon',
      },
      geometryLabel: 'myShape',
      geoFieldNames: ['geo.coordinates', 'location'],
    });
    expect(extractFeaturesFromFilters([spatialFilter])).toEqual([
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-101.21639, 48.1413],
              [-101.21639, 41.84905],
              [-90.95149, 41.84905],
              [-90.95149, 48.1413],
              [-101.21639, 48.1413],
            ],
          ],
        } as Polygon,
        properties: {
          filter: 'intersects myShape',
        },
      },
    ]);
  });

  it('should ignore geo_shape filter with pre-index shape', () => {
    const spatialFilter = buildGeoShapeFilter({
      preIndexedShape: {
        index: 'world_countries_v1',
        id: 's5gldXEBkTB2HMwpC8y0',
        path: 'coordinates',
      },
      geometryLabel: 'myShape',
      geoFieldNames: ['geo.coordinates'],
    });
    expect(extractFeaturesFromFilters([spatialFilter])).toEqual([]);
  });
});
