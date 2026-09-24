/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

let mockParseThrows = false;

jest.mock('unified', () => {
  const unifiedModule = jest.requireActual('unified');
  const actualUnified = typeof unifiedModule === 'function' ? unifiedModule : unifiedModule.default;

  return {
    __esModule: true,
    default: jest.fn((...args: unknown[]) => {
      const processor = actualUnified(...args);
      const originalParse = processor.parse.bind(processor);

      processor.parse = jest.fn((...parseArgs: Parameters<typeof originalParse>) => {
        if (mockParseThrows) {
          throw new Error('parse failed');
        }
        return originalParse(...parseArgs);
      });

      return processor;
    }),
  };
});

import { parseCommentString, stringifyMarkdownComment } from './utils';

describe('markdown utils', () => {
  describe('parseCommentString', () => {
    afterEach(() => {
      mockParseThrows = false;
    });

    it('parses a simple comment into a valid markdown node', () => {
      const parsed = parseCommentString('hello world');

      expect(parsed.type).toEqual('root');
      expect(parsed.children?.length).toBeGreaterThan(0);
    });

    describe('when processor.parse throws', () => {
      beforeEach(() => {
        mockParseThrows = true;
      });

      it('returns a plain text fallback paragraph node', () => {
        const comment = 'malformed **markdown';
        const parsed = parseCommentString(comment);

        expect(parsed).toEqual({
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value: comment,
            },
          ],
        });
      });

      it('preserves the original comment content in the fallback node', () => {
        const comment = '!{lens{"invalid": json}';
        const parsed = parseCommentString(comment);

        expect(parsed.children?.[0]).toEqual({
          type: 'text',
          value: comment,
        });
      });
    });
  });

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
