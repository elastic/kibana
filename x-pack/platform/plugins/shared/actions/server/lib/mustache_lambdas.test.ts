/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { renderMustacheString } from './mustache_renderer';

const logger = loggingSystemMock.create().get();

describe('mustache lambdas', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('FormatDate', () => {
    it('date with defaults is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
          {{#FormatDate}} {{timeStamp}} {{/FormatDate}}
        `.trim();

      expect(renderMustacheString(logger, template, { timeStamp }, 'none')).toEqual(
        '2022-11-29 03:52pm'
      );
    });

    it('date with a time zone is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
          {{#FormatDate}} {{timeStamp}} ; America/New_York {{/FormatDate}}
        `.trim();

      expect(renderMustacheString(logger, template, { timeStamp }, 'none')).toEqual(
        '2022-11-29 10:52am'
      );
    });

    it('date with a format is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
          {{#FormatDate}} {{timeStamp}} ;; dddd MMM Do YYYY HH:mm:ss.SSS {{/FormatDate}}
        `.trim();

      expect(renderMustacheString(logger, template, { timeStamp }, 'none')).toEqual(
        'Tuesday Nov 29th 2022 15:52:44.000'
      );
    });

    it('date with a format and timezone is successful', () => {
      const timeStamp = '2022-11-29T15:52:44Z';
      const template = dedent`
        {{#FormatDate}} {{timeStamp}};America/New_York;dddd MMM Do YYYY HH:mm:ss.SSS {{/FormatDate}}
      `.trim();

      expect(renderMustacheString(logger, template, { timeStamp }, 'none').trim()).toEqual(
        'Tuesday Nov 29th 2022 10:52:44.000'
      );
    });

    it('empty date logs and returns error string', () => {
      const timeStamp = '';
      const template = dedent`
        {{#FormatDate}}   {{/FormatDate}}
      `.trim();

      expect(renderMustacheString(logger, template, { timeStamp }, 'none').trim()).toEqual(
        'date is empty'
      );
      expect(logger.warn).toHaveBeenCalledWith(`mustache render error: date is empty`);
    });

    it('invalid date logs and returns error string', () => {
      const timeStamp = 'this is not a d4t3';
      const template = dedent`
        {{#FormatDate}}{{timeStamp}}{{/FormatDate}}
      `.trim();

      expect(renderMustacheString(logger, template, { timeStamp }, 'none').trim()).toEqual(
        'invalid date "this is not a d4t3"'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `mustache render error: invalid date "this is not a d4t3"`
      );
    });

    it('invalid timezone logs and returns error string', () => {
      const timeStamp = '2023-04-10T23:52:39';
      const template = dedent`
        {{#FormatDate}}{{timeStamp}};NotATime Zone!{{/FormatDate}}
      `.trim();

      expect(renderMustacheString(logger, template, { timeStamp }, 'none').trim()).toEqual(
        'unknown timeZone value "NotATime Zone!"'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `mustache render error: unknown timeZone value "NotATime Zone!"`
      );
    });

    it('invalid format produces error', () => {
      const timeStamp = '2023-04-10T23:52:39';
      const template = dedent`
        {{#FormatDate}}{{timeStamp}};;garbage{{/FormatDate}}
      `.trim();

      // not clear how to force an error, it pretty much does something with
      // ANY string
      expect(renderMustacheString(logger, template, { timeStamp }, 'none').trim()).toEqual(
        'gamrbamg2' // a => am/pm (so am here); e => day of week
      );
    });
  });

  describe('EvalMath', () => {
    it('math is successful', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
        },
      };
      const template = dedent`
          {{#EvalMath}} 1 + 0 {{/EvalMath}}
          {{#EvalMath}} 1 + context.a.b {{/EvalMath}}
          {{#context}}
          {{#EvalMath}} 1 + c.d {{/EvalMath}}
          {{/context}}
        `.trim();

      const result = renderMustacheString(logger, template, vars, 'none');
      expect(result).toEqual(`1\n2\n3\n`);
    });

    it('invalid expression logs and returns error string', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
        },
      };
      const template = dedent`
          {{#EvalMath}} ) 1 ++++ 0 ( {{/EvalMath}}
        `.trim();

      const result = renderMustacheString(logger, template, vars, 'none');
      expect(result).toEqual(
        'error evaluating tinymath expression ") 1 ++++ 0 (": Failed to parse expression. Expected "(", function, literal, or whitespace but ")" found.'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `mustache render error: error evaluating tinymath expression ") 1 ++++ 0 (": Failed to parse expression. Expected "(", function, literal, or whitespace but ")" found.`
      );
    });
  });

  describe('ParseHJson', () => {
    it('valid Hjson is successful', () => {
      const vars = {
        context: {
          a: { b: 1 },
          c: { d: 2 },
        },
      };
      const hjson = `
        {
          # specify rate in requests/second (because comments are helpful!)
          rate: 1000

          a:   {{context.a}}
          a_b: {{context.a.b}}
          c:   {{context.c}}
          c_d: {{context.c.d}}

          # list items can be separated by lines, or commas, and trailing
          # commas permitted
          list: [
            1 2
            3
            4,5,6,
          ]
        }`;
      const template = dedent`
          {{#ParseHjson}} ${hjson} {{/ParseHjson}}
        `.trim();

      const result = renderMustacheString(logger, template, vars, 'none');
      expect(JSON.parse(result)).toMatchInlineSnapshot(`
        Object {
          "a": Object {
            "b": 1,
          },
          "a_b": 1,
          "c": Object {
            "d": 2,
          },
          "c_d": 2,
          "list": Array [
            "1 2",
            3,
            4,
            5,
            6,
          ],
          "rate": 1000,
        }
      `);
    });

    it('logs an error message and returns error string on parse errors', () => {
      const template = dedent`
          {{#ParseHjson}} [1,2,3,,] {{/ParseHjson}}
        `.trim();

      const result = renderMustacheString(logger, template, {}, 'none');
      expect(result).toEqual(
        `error parsing Hjson \"[1,2,3,,]\": Found a punctuator character ',' when expecting a quoteless string (check your syntax) at line 1,7 >>>1,2,3,,] ...`
      );
      expect(logger.warn).toHaveBeenCalledWith(
        `mustache render error: error parsing Hjson \"[1,2,3,,]\": Found a punctuator character ',' when expecting a quoteless string (check your syntax) at line 1,7 >>>1,2,3,,] ...`
      );
    });
  });

  describe('FormatNumber', () => {
    it('valid format string is successful', () => {
      const num = '42.0';
      const template = dedent`
          {{#FormatNumber}} {{num}}; en-US; style: currency, currency: EUR  {{/FormatNumber}}
        `.trim();

      expect(renderMustacheString(logger, template, { num }, 'none')).toEqual('€42.00');
    });

    it('logs an error message and returns empty string on errors', () => {
      const num = 'nope;;';
      const template = dedent`
          {{#FormatNumber}} {{num}} {{/FormatNumber}}
        `.trim();

      expect(renderMustacheString(logger, template, { num }, 'none')).toEqual(
        `invalid number: 'nope'`
      );
      expect(logger.warn).toHaveBeenCalledWith(`mustache render error: invalid number: 'nope'`);
    });
  });
});
