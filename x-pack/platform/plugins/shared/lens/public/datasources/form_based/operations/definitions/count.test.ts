/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExpression, parseExpression } from '@kbn/expressions-plugin/common';
import { operationDefinitionMap } from '.';

describe('count operation', () => {
  describe('getGroupByKey', () => {
    const getKey = operationDefinitionMap.count.getGroupByKey!;
    const expressionToKey = (expression: string) =>
      getKey(buildExpression(parseExpression(expression))) as string;

    describe('generates unique keys based on configuration', () => {
      const keys = [
        [
          'aggValueCount id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false',
          'aggValueCount id="1" enabled=true schema="metric" field="bytes" emptyAsNull=false',
        ],
        [
          'aggFilteredMetric id="2" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggValueCount id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="3" enabled=true schema="metric" \n  customBucket={aggFilter id="3-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggValueCount id="3-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        [
          'aggFilteredMetric id="4" enabled=true schema="metric" \n  customBucket={aggFilter id="4-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggValueCount id="4-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="5" enabled=true schema="metric" \n  customBucket={aggFilter id="5-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "}} \n  customMetric={aggValueCount id="5-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        [
          'aggFilteredMetric id="6" enabled=true schema="metric" \n  customBucket={aggFilter id="6-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggValueCount id="6-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="7" enabled=true schema="metric" \n  customBucket={aggFilter id="7-filter" enabled=true schema="bucket" filter={lucene q="\\"geo.dest: \\\\\\"AL\\\\\\" \\""}} \n  customMetric={aggValueCount id="7-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        [
          'aggFilteredMetric id="8" enabled=true schema="metric" \n  customBucket={aggFilter id="8-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggValueCount id="8-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
          'aggFilteredMetric id="9" enabled=true schema="metric" \n  customBucket={aggFilter id="9-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"AL\\" "} timeWindow="1m"} \n  customMetric={aggValueCount id="9-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}',
        ],
        [
          'aggCount id="10" enabled=true schema="metric" emptyAsNull=true',
          'aggCount id="11" enabled=true schema="metric" emptyAsNull=true',
        ],
        [
          'aggCount id="10" enabled=true schema="metric" emptyAsNull=false',
          'aggCount id="11" enabled=true schema="metric" emptyAsNull=false',
        ],
        [
          'aggValueCount id="12" enabled=true schema="metric" field="agent.keyword" emptyAsNull=false',
          'aggValueCount id="13" enabled=true schema="metric" field="agent.keyword" emptyAsNull=false',
        ],
        [
          'aggValueCount id="12" enabled=true schema="metric" field="agent.keyword" emptyAsNull=true',
          'aggValueCount id="13" enabled=true schema="metric" field="agent.keyword" emptyAsNull=true',
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
              "aggValueCount-bytes-false-undefined",
              "aggValueCount-bytes-false-undefined",
            ],
            Array [
              "aggValueCount-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"GA\\" ",
              "aggValueCount-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"GA\\" ",
            ],
            Array [
              "aggValueCount-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"AL\\" ",
              "aggValueCount-filtered-bytes-false-undefined-undefined-kql-geo.dest: \\"AL\\" ",
            ],
            Array [
              "aggValueCount-filtered-bytes-false-undefined-undefined-lucene-\\"geo.dest: \\\\\\"AL\\\\\\" \\"",
              "aggValueCount-filtered-bytes-false-undefined-undefined-lucene-\\"geo.dest: \\\\\\"AL\\\\\\" \\"",
            ],
            Array [
              "aggValueCount-filtered-bytes-false-1m-undefined-kql-geo.dest: \\"AL\\" ",
              "aggValueCount-filtered-bytes-false-1m-undefined-kql-geo.dest: \\"AL\\" ",
            ],
            Array [
              "aggCount-undefined-true-undefined",
              "aggCount-undefined-true-undefined",
            ],
            Array [
              "aggCount-undefined-false-undefined",
              "aggCount-undefined-false-undefined",
            ],
            Array [
              "aggValueCount-agent.keyword-false-undefined",
              "aggValueCount-agent.keyword-false-undefined",
            ],
            Array [
              "aggValueCount-agent.keyword-true-undefined",
              "aggValueCount-agent.keyword-true-undefined",
            ],
          ]
        `);
      });
    });

    it('returns undefined for aggs from different operation classes', () => {
      expect(
        expressionToKey(
          'aggSum id="0" enabled=true schema="metric" field="bytes" emptyAsNull=false'
        )
      ).toBeUndefined();
      expect(
        expressionToKey(
          'aggFilteredMetric id="2" enabled=true schema="metric" \n  customBucket={aggFilter id="2-filter" enabled=true schema="bucket" filter={kql q="geo.dest: \\"GA\\" "}} \n  customMetric={aggSum id="2-metric" enabled=true schema="metric" field="bytes" emptyAsNull=false}'
        )
      ).toBeUndefined();
    });
  });
});
