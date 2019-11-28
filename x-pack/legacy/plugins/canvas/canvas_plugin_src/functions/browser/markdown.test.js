/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { testTable } from '../common/__tests__/fixtures/test_tables';
import { fontStyle } from '../common/__tests__/fixtures/test_styles';
import { markdown } from './markdown';

describe('markdown', () => {
  const fn = functionWrapper(markdown);

  it('returns a render as markdown', () => {
    const result = fn(null, { content: [''], font: fontStyle });
    expect(result).toHaveProperty('type', 'render');
    expect(result).toHaveProperty('as', 'markdown');
  });

  describe('args', () => {
    describe('expression', () => {
      it('sets the content to all strings in expression concatenated', () => {
        const result = fn(null, {
          content: ['# this ', 'is ', 'some ', 'markdown'],
          font: fontStyle,
        });

        expect(result.value).toHaveProperty('content', '# this is some markdown');
      });

      it('compiles and concatenates handlebars expressions using context', () => {
        let expectedContent = 'Columns:';
        testTable.columns.map(col => (expectedContent += ` ${col.name}`));

        const result = fn(testTable, {
          content: ['Columns:', '{{#each columns}} {{name}}{{/each}}'],
        });

        expect(result.value).toHaveProperty('content', expectedContent);
      });
    });

    describe('font', () => {
      it('sets the font style for the markdown', () => {
        const result = fn(null, {
          content: ['some ', 'markdown'],
          font: fontStyle,
        });

        expect(result.value).toHaveProperty('font', fontStyle);
      });

      // TODO: write test when using an instance of the interpreter
      // it("defaults to the expression '{font}'", () => {});
    });
  });
});
