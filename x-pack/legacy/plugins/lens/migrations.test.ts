/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { migrations, RawLensSavedXYObject770 } from './migrations';
import { SimpleSavedObject } from 'src/core/public';

describe('Lens migrations', () => {
  describe('7.7.0 missing dimensions in XY', () => {
    const migrate = (doc: SimpleSavedObject | RawLensSavedXYObject770) => migrations['7.7.0'](doc);

    const example: RawLensSavedXYObject770 = {
      type: 'lens',
      attributes: {
        expression:
          'kibana\n| kibana_context  query="{\\"language\\":\\"kuery\\",\\"query\\":\\"\\"}" \n| lens_merge_tables layerIds="c61a8afb-a185-4fae-a064-fb3846f6c451" \n  tables={esaggs index="logstash-*" metricsAtAllLevels=false partialRows=false includeFormatHints=true aggConfigs="[{\\"id\\":\\"2cd09808-3915-49f4-b3b0-82767eba23f7\\",\\"enabled\\":true,\\"type\\":\\"max\\",\\"schema\\":\\"metric\\",\\"params\\":{\\"field\\":\\"bytes\\"}}]" | lens_rename_columns idMap="{\\"col-0-2cd09808-3915-49f4-b3b0-82767eba23f7\\":\\"2cd09808-3915-49f4-b3b0-82767eba23f7\\"}"}\n| lens_metric_chart title="Maximum of bytes" accessor="2cd09808-3915-49f4-b3b0-82767eba23f7"',
        state: {
          datasourceMetaData: {
            filterableIndexPatterns: [
              {
                id: 'logstash-*',
                title: 'logstash-*',
              },
            ],
          },
          datasourceStates: {
            indexpattern: {
              currentIndexPatternId: 'logstash-*',
              layers: {
                'c61a8afb-a185-4fae-a064-fb3846f6c451': {
                  columnOrder: ['2cd09808-3915-49f4-b3b0-82767eba23f7'],
                  columns: {
                    '2cd09808-3915-49f4-b3b0-82767eba23f7': {
                      dataType: 'number',
                      isBucketed: false,
                      label: 'Maximum of bytes',
                      operationType: 'max',
                      scale: 'ratio',
                      sourceField: 'bytes',
                    },
                    'd3e62a7a-c259-4fff-a2fc-eebf20b7008a': {
                      dataType: 'number',
                      isBucketed: false,
                      label: 'Minimum of bytes',
                      operationType: 'min',
                      scale: 'ratio',
                      sourceField: 'bytes',
                    },
                    'd6e40cea-6299-43b4-9c9d-b4ee305a2ce8': {
                      dataType: 'date',
                      isBucketed: true,
                      label: 'Date Histogram of @timestamp',
                      operationType: 'date_histogram',
                      params: {
                        interval: 'auto',
                      },
                      scale: 'interval',
                      sourceField: '@timestamp',
                    },
                  },
                  indexPatternId: 'logstash-*',
                },
              },
            },
          },
          filters: [],
          query: {
            language: 'kuery',
            query: '',
          },
          visualization: {
            accessor: '2cd09808-3915-49f4-b3b0-82767eba23f7',
            isHorizontal: false,
            layerId: 'c61a8afb-a185-4fae-a064-fb3846f6c451',
            layers: [
              {
                accessors: [
                  'd3e62a7a-c259-4fff-a2fc-eebf20b7008a',
                  '26ef70a9-c837-444c-886e-6bd905ee7335',
                ],
                layerId: 'c61a8afb-a185-4fae-a064-fb3846f6c451',
                seriesType: 'area',
                splitAccessor: '54cd64ed-2a44-4591-af84-b2624504569a',
                xAccessor: 'd6e40cea-6299-43b4-9c9d-b4ee305a2ce8',
              },
            ],
            legend: {
              isVisible: true,
              position: 'right',
            },
            preferredSeriesType: 'area',
          },
        },
        title: 'Artistpreviouslyknownaslens',
        visualizationType: 'lnsXY',
      },
    };

    it('should not change anything by XY visualizations', () => {
      const target = {
        ...example,
        attributes: {
          ...example.attributes,
          visualizationType: 'lnsMetric',
        },
      };
      const result = migrate(target as SimpleSavedObject);
      expect(result).toEqual(target);
    });

    it('should handle missing layers', () => {
      const result = migrate({
        ...example,
        attributes: {
          ...example.attributes,
          state: {
            ...example.attributes.state,
            datasourceStates: {
              indexpattern: {
                layers: [],
              },
            },
          },
        },
      } as SimpleSavedObject) as RawLensSavedXYObject770;

      expect(result.attributes.state.visualization.layers).toEqual([
        {
          layerId: 'c61a8afb-a185-4fae-a064-fb3846f6c451',
          seriesType: 'area',
          // Removed split accessor
          splitAccessor: undefined,
          xAccessor: undefined,
          // Removed a yAcccessor
          accessors: [],
        },
      ]);
    });

    it('should remove only missing accessors', () => {
      const result = migrate(example) as RawLensSavedXYObject770;

      expect(result.attributes.state.visualization.layers).toEqual([
        {
          layerId: 'c61a8afb-a185-4fae-a064-fb3846f6c451',
          seriesType: 'area',
          xAccessor: 'd6e40cea-6299-43b4-9c9d-b4ee305a2ce8',
          // Removed split accessor
          splitAccessor: undefined,
          // Removed a yAcccessor
          accessors: ['d3e62a7a-c259-4fff-a2fc-eebf20b7008a'],
        },
      ]);
    });
  });
});
