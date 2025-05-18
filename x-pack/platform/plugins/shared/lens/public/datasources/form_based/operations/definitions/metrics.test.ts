/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExpression, parseExpression } from '@kbn/expressions-plugin/common';
import { operationDefinitionMap } from '.';

const sumOperation = operationDefinitionMap.sum;

describe('metrics', () => {
  describe('getGroupByKey', () => {
    const getKey = sumOperation.getGroupByKey!;
    const expressionToKey = (expression: string) =>
      getKey(buildExpression(parseExpression(expression)));

    describe('should collapse filtered aggs with matching parameters', () => {
      const keys = [
        [
          'aggSum id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false',
          'aggSum id="1" enabled=true schema="metric" field="bytes" emptyAsNull=false',
        ],
        [
          'aggSum id="2" enabled=true schema="metric" field="bytes" emptyAsNull=true',
          'aggSum id="3" enabled=true schema="metric" field="bytes" emptyAsNull=true',
        ],
        [
          'aggSum id="4" enabled=true schema="metric" field="hour_of_day" emptyAsNull=false',
          'aggSum id="5" enabled=true schema="metric" field="hour_of_day" emptyAsNull=false',
        ],
        [
          'aggSum id="6" enabled=true schema="metric" field="machine.ram" timeShift="1h" emptyAsNull=false',
          'aggSum id="7" enabled=true schema="metric" field="machine.ram" timeShift="1h" emptyAsNull=false',
        ],
        [
          'aggSum id="8" enabled=true schema="metric" field="machine.ram" timeShift="2h" emptyAsNull=false',
          'aggSum id="9" enabled=true schema="metric" field="machine.ram" timeShift="2h" emptyAsNull=false',
        ],
        [
          'aggFilteredMetric id="10" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggSum id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=true}',
          'aggFilteredMetric id="11" enabled=true schema="metric" \n  customBucket={aggFilter id="3-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggSum id="3-metric" enabled=true schema="metric" field="bytes" emptyAsNull=true}',
        ],
        [
          'aggFilteredMetric id="12" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggSum id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="13" enabled=true schema="metric" \n  customBucket={aggFilter id="3-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggSum id="3-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        [
          'aggFilteredMetric id="14" enabled=true schema="metric" \n  customBucket={aggFilter id="4-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggSum id="4-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="15" enabled=true schema="metric" \n  customBucket={aggFilter id="5-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggSum id="5-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        [
          'aggFilteredMetric id="16" enabled=true schema="metric" \n  customBucket={aggFilter id="6-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggSum id="6-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="17" enabled=true schema="metric" \n  customBucket={aggFilter id="7-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggSum id="7-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        [
          'aggFilteredMetric id="18" enabled=true schema="metric" \n  customBucket={aggFilter id="8-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggSum id="8-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="19" enabled=true schema="metric" \n  customBucket={aggFilter id="9-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggSum id="9-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
      ].map((group) => group.map(expressionToKey));

      it.each(keys.map((group, i) => ({ group })))('%#', ({ group: thisGroup }) => {
        expect(thisGroup[0]).toEqual(thisGroup[1]);
        const otherGroups = keys.filter((group) => group !== thisGroup);
        for (const otherGroup of otherGroups) {
          expect(thisGroup[0]).not.toEqual(otherGroup[0]);
        }
      });

      it('snapshot', () => {
        expect(keys).toMatchInlineSnapshot(`
          Array [
            Array [
              "aggSum-bytes-false-undefined",
              "aggSum-bytes-false-undefined",
            ],
            Array [
              "aggSum-bytes-true-undefined",
              "aggSum-bytes-true-undefined",
            ],
            Array [
              "aggSum-hour_of_day-false-undefined",
              "aggSum-hour_of_day-false-undefined",
            ],
            Array [
              "aggSum-machine.ram-false-1h",
              "aggSum-machine.ram-false-1h",
            ],
            Array [
              "aggSum-machine.ram-false-2h",
              "aggSum-machine.ram-false-2h",
            ],
            Array [
              "aggSum-filtered-bytes-true-undefined-undefined-kql-geo.dest: \\"GA\\" ",
              "aggSum-filtered-bytes-true-undefined-undefined-kql-geo.dest: \\"GA\\" ",
            ],
            Array [
              "aggSum-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"GA\\" ",
              "aggSum-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"GA\\" ",
            ],
            Array [
              "aggSum-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"AL\\" ",
              "aggSum-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"AL\\" ",
            ],
            Array [
              "aggSum-filtered-bytes-false-undefined-undefined-lucene-\\"geo.dest: \\\\\\"AL\\\\\\" \\"",
              "aggSum-filtered-bytes-false-undefined-undefined-lucene-\\"geo.dest: \\\\\\"AL\\\\\\" \\"",
            ],
            Array [
              "aggSum-filtered-bytes-false-1m-undefined-kql-geo.dest: \\"AL\\" ",
              "aggSum-filtered-bytes-false-1m-undefined-kql-geo.dest: \\"AL\\" ",
            ],
          ]
        `);
      });
    });

    it('returns undefined for aggs from different operation classes', () => {
      expect(
        expressionToKey(
          'aggCardinality id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false'
        )
      ).toBeUndefined();
      expect(
        expressionToKey(
          'aggFilteredMetric id="2" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggCardinality id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}'
        )
      ).toBeUndefined();
    });
  });
});
