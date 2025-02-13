/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCommentString, stringifyMarkdownComment } from './utils';

describe('markdown utils', () => {
  describe('stringifyComment', () => {
    it('adds a newline to the end if one does not exist', () => {
      const parsed = parseCommentString('hello');
      expect(stringifyMarkdownComment(parsed)).toEqual('hello\n');
    });

    it('does not add a newline to the end if one already exists', () => {
      const parsed = parseCommentString('hello\n');
      expect(stringifyMarkdownComment(parsed)).toEqual('hello\n');
    });

    // This check ensures the version of remark-stringify supports tables. From version 9+ this is not supported by default.
    it('parses and stringifies github formatted markdown correctly', () => {
      const parsed = parseCommentString(`| Tables   |      Are      |  Cool |
      |----------|:-------------:|------:|
      | col 1 is |  left-aligned | $1600 |
      | col 2 is |    centered   |   $12 |
      | col 3 is | right-aligned |    $1 |`);

      expect(stringifyMarkdownComment(parsed)).toMatchInlineSnapshot(`
        "| Tables   |      Are      |  Cool |
        | -------- | :-----------: | ----: |
        | col 1 is |  left-aligned | $1600 |
        | col 2 is |    centered   |   $12 |
        | col 3 is | right-aligned |    $1 |
        "
      `);
    });

    it('parses a timeline url', () => {
      const timelineUrl =
        '[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))';

      const parsedNodes = parseCommentString(timelineUrl);

      expect(parsedNodes).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "match": "[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))",
              "position": Position {
                "end": Object {
                  "column": 138,
                  "line": 1,
                  "offset": 137,
                },
                "indent": Array [],
                "start": Object {
                  "column": 1,
                  "line": 1,
                  "offset": 0,
                },
              },
              "type": "timeline",
            },
          ],
          "position": Object {
            "end": Object {
              "column": 138,
              "line": 1,
              "offset": 137,
            },
            "start": Object {
              "column": 1,
              "line": 1,
              "offset": 0,
            },
          },
          "type": "root",
        }
      `);
    });

    it('stringifies a timeline url', () => {
      const timelineUrl =
        '[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))';

      const parsedNodes = parseCommentString(timelineUrl);

      expect(stringifyMarkdownComment(parsedNodes)).toEqual(`${timelineUrl}\n`);
    });

    it('parses a lens visualization', () => {
      const lensVisualization =
        '!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"TEst22","type":"lens","visualizationType":"lnsMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"}}}}}},"visualization":{"layerId":"layer1","accessor":"col2"},"query":{"language":"kuery","query":""},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-layer1"}]}}}';

      const parsedNodes = parseCommentString(lensVisualization);
      expect(parsedNodes.children[0].type).toEqual('lens');
    });

    it('stringifies a lens visualization', () => {
      const lensVisualization =
        '!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"TEst22","type":"lens","visualizationType":"lnsMetric","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"}}}}}},"visualization":{"layerId":"layer1","accessor":"col2"},"query":{"language":"kuery","query":""},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-layer1"}]}}}';

      const parsedNodes = parseCommentString(lensVisualization);

      expect(stringifyMarkdownComment(parsedNodes)).toEqual(`${lensVisualization}\n`);
    });
  });
});
