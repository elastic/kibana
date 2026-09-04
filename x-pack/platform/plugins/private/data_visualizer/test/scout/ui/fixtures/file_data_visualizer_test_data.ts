/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { ML_JOB_FIELD_TYPES } from '@kbn/ml-anomaly-utils';

const FILES_DIR = path.join(__dirname, 'files_to_import');

export interface FileDataVisualizerTestData {
  suiteSuffix: string;
  filePath: string;
  indexName: string;
  createIndexPattern: boolean;
  fieldTypeFilters: string[];
  fieldNameFilters: string[];
  expected: {
    results: {
      title: string;
      highlightedText: boolean;
    };
    metricFields: Array<{
      fieldName: string;
      type: string;
      docCountFormatted: string;
      statsMaxDecimalPlaces?: number;
      topValuesCount: number;
      exampleCount?: number;
    }>;
    nonMetricFields: Array<{
      fieldName: string;
      type: string;
      docCountFormatted: string;
      exampleCount: number;
    }>;
    allFields: string[];
    visibleMetricFieldsCount: number;
    totalMetricFieldsCount: number;
    populatedFieldsCount: number;
    totalFieldsCount: number;
    fieldTypeFiltersResultCount: number;
    fieldNameFiltersResultCount: number;
    ingestedDocCount: number;
  };
}

export const fileDataVisualizerPositiveTestData: FileDataVisualizerTestData[] = [
  {
    suiteSuffix: 'with an artificial server log',
    filePath: path.join(FILES_DIR, 'artificial_server_log'),
    indexName: 'user-import_1',
    createIndexPattern: false,
    fieldTypeFilters: [ML_JOB_FIELD_TYPES.NUMBER, ML_JOB_FIELD_TYPES.DATE],
    fieldNameFilters: ['source.address'],
    expected: {
      results: {
        title: 'artificial_server_log',
        highlightedText: true,
      },
      metricFields: [
        {
          fieldName: 'http.response.body.bytes',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          docCountFormatted: '19 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 8,
        },
        {
          fieldName: 'http.version',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          docCountFormatted: '19 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 1,
        },
        {
          fieldName: 'http.response.status_code',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          docCountFormatted: '19 (100%)',
          statsMaxDecimalPlaces: 3,
          topValuesCount: 3,
        },
      ],
      nonMetricFields: [
        {
          fieldName: 'timestamp',
          type: ML_JOB_FIELD_TYPES.DATE,
          docCountFormatted: '19 (100%)',
          exampleCount: 10,
        },
        {
          fieldName: 'user_agent.original',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          exampleCount: 8,
          docCountFormatted: '19 (100%)',
        },
        {
          fieldName: 'http.request.method',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          exampleCount: 1,
          docCountFormatted: '19 (100%)',
        },
        {
          fieldName: 'url.original',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          exampleCount: 2,
          docCountFormatted: '19 (100%)',
        },
        {
          fieldName: 'source.address',
          type: ML_JOB_FIELD_TYPES.IP,
          exampleCount: 7,
          docCountFormatted: '19 (100%)',
        },
        {
          fieldName: 'message',
          type: ML_JOB_FIELD_TYPES.TEXT,
          exampleCount: 10,
          docCountFormatted: '19 (100%)',
        },
      ],
      allFields: [
        '@timestamp',
        'http',
        'http.request',
        'http.request.method',
        'http.response',
        'http.response.body',
        'http.response.body.bytes',
        'http.response.status_code',
        'http.version',
        'message',
        'source',
        'source.address',
        'url',
        'url.original',
        'user_agent',
        'user_agent.original',
      ],
      visibleMetricFieldsCount: 3,
      totalMetricFieldsCount: 3,
      populatedFieldsCount: 9,
      totalFieldsCount: 9,
      fieldTypeFiltersResultCount: 4,
      fieldNameFiltersResultCount: 1,
      ingestedDocCount: 20,
    },
  },
  {
    suiteSuffix: 'with a file containing geo field',
    filePath: path.join(FILES_DIR, 'geo_file.csv'),
    indexName: 'user-import_2',
    createIndexPattern: false,
    fieldTypeFilters: [ML_JOB_FIELD_TYPES.GEO_POINT],
    fieldNameFilters: ['Coordinates'],
    expected: {
      results: {
        title: 'geo_file.csv',
        highlightedText: false,
      },
      metricFields: [],
      nonMetricFields: [
        {
          fieldName: 'Context',
          type: ML_JOB_FIELD_TYPES.UNKNOWN,
          docCountFormatted: '0 (0%)',
          exampleCount: 0,
        },
        {
          fieldName: 'Coordinates',
          type: ML_JOB_FIELD_TYPES.GEO_POINT,
          docCountFormatted: '13 (100%)',
          exampleCount: 7,
        },
        {
          fieldName: 'Location',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          docCountFormatted: '13 (100%)',
          exampleCount: 7,
        },
      ],
      allFields: ['Coordinates', 'Location'],
      visibleMetricFieldsCount: 0,
      totalMetricFieldsCount: 0,
      populatedFieldsCount: 3,
      totalFieldsCount: 3,
      fieldTypeFiltersResultCount: 1,
      fieldNameFiltersResultCount: 1,
      ingestedDocCount: 13,
    },
  },
  {
    suiteSuffix: 'with a file with a missing new line char at the end',
    filePath: path.join(FILES_DIR, 'missing_end_of_file_newline.csv'),
    indexName: 'user-import_3',
    createIndexPattern: false,
    fieldTypeFilters: [],
    fieldNameFilters: [],
    expected: {
      results: {
        title: 'missing_end_of_file_newline.csv',
        highlightedText: false,
      },
      metricFields: [
        {
          fieldName: 'value',
          type: ML_JOB_FIELD_TYPES.NUMBER,
          docCountFormatted: '3 (100%)',
          exampleCount: 3,
          topValuesCount: 3,
        },
      ],
      nonMetricFields: [
        {
          fieldName: 'title',
          type: ML_JOB_FIELD_TYPES.UNKNOWN,
          docCountFormatted: '3 (100%)',
          exampleCount: 3,
        },
        {
          fieldName: 'description',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          docCountFormatted: '3 (100%)',
          exampleCount: 3,
        },
      ],
      allFields: ['description', 'title', 'value'],
      visibleMetricFieldsCount: 1,
      totalMetricFieldsCount: 1,
      populatedFieldsCount: 3,
      totalFieldsCount: 3,
      fieldTypeFiltersResultCount: 3,
      fieldNameFiltersResultCount: 3,
      ingestedDocCount: 3,
    },
  },
  {
    suiteSuffix: 'with a file which does not generate a ingest pipeline',
    filePath: path.join(FILES_DIR, 'flights_small.json'),
    indexName: 'user-import_4',
    createIndexPattern: false,
    fieldTypeFilters: [ML_JOB_FIELD_TYPES.KEYWORD],
    fieldNameFilters: ['timestamp'],
    expected: {
      results: {
        title: 'flights_small.json',
        highlightedText: false,
      },
      metricFields: [],
      nonMetricFields: [
        {
          fieldName: 'Carrier',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          docCountFormatted: '20 (100%)',
          exampleCount: 4,
        },
        {
          fieldName: 'timestamp',
          type: ML_JOB_FIELD_TYPES.KEYWORD,
          docCountFormatted: '20 (100%)',
          exampleCount: 11,
        },
      ],
      allFields: [
        'AvgTicketPrice',
        'Cancelled',
        'Carrier',
        'Dest',
        'DestAirportID',
        'DestCityName',
        'DestCountry',
        'DestLocation',
        'DestLocation.lat',
        'DestLocation.lat.keyword',
        'DestLocation.lon',
        'DestLocation.lon.keyword',
        'DestRegion',
        'DestWeather',
        'DistanceKilometers',
        'FlightDelayMin',
        'FlightDelayType',
        'FlightNum',
        'FlightTimeHour',
        'FlightTimeMin',
        'Origin',
        'OriginAirportID',
        'OriginCityName',
        'OriginCountry',
        'OriginLocation',
        'OriginLocation.lat',
        'OriginLocation.lat.keyword',
        'OriginLocation.lon',
        'OriginLocation.lon.keyword',
        'OriginRegion',
        'OriginWeather',
        'dayOfWeek',
        'timestamp',
      ],
      visibleMetricFieldsCount: 6,
      totalMetricFieldsCount: 6,
      populatedFieldsCount: 3,
      totalFieldsCount: 25,
      fieldTypeFiltersResultCount: 16,
      fieldNameFiltersResultCount: 1,
      ingestedDocCount: 20,
    },
  },
];

export const fileDataVisualizerNegativeTestData = [
  {
    suiteSuffix: 'with a non-log file',
    filePath: path.join(FILES_DIR, 'not_a_log_file'),
  },
];
