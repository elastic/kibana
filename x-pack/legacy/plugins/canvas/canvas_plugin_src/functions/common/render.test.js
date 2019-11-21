/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functionWrapper } from '../../../__tests__/helpers/function_wrapper';
import { DEFAULT_ELEMENT_CSS } from '../../../common/lib/constants';
import { testTable } from './__tests__/fixtures/test_tables';
import { fontStyle, containerStyle } from './__tests__/fixtures/test_styles';
import { render } from './render';

const renderTable = {
  type: 'render',
  as: 'table',
  value: {
    datatable: testTable,
    font: fontStyle,
    paginate: false,
    perPage: 2,
  },
};

describe('render', () => {
  const fn = functionWrapper(render);

  it('returns a render', () => {
    const result = fn(renderTable, {
      as: 'debug',
      css: '".canvasRenderEl { background-color: red; }"',
      containerStyle: containerStyle,
    });

    expect(result).toHaveProperty('type', 'render');
  });

  describe('args', () => {
    describe('as', () => {
      it('sets what the element will render as', () => {
        const result = fn(renderTable, { as: 'debug' });
        expect(result).toHaveProperty('as', 'debug');
      });

      it('keep the original context.as if not specified', () => {
        const result = fn(renderTable);
        expect(result).toHaveProperty('as', renderTable.as);
      });
    });

    describe('css', () => {
      it('sets the custom CSS for the render elemnt', () => {
        const result = fn(renderTable, {
          css: '".canvasRenderEl { background-color: red; }"',
        });

        expect(result).toHaveProperty('css', '".canvasRenderEl { background-color: red; }"');
      });

      it(`defaults to '${DEFAULT_ELEMENT_CSS}'`, () => {
        const result = fn(renderTable);
        expect(result).toHaveProperty('css', `"${DEFAULT_ELEMENT_CSS}"`);
      });
    });

    describe('containerStyle', () => {
      it('sets the containerStyler', () => {
        const result = fn(renderTable, { containerStyle: containerStyle });

        expect(result).toHaveProperty('containerStyle', containerStyle);
      });

      it('returns a render object with containerStyle as undefined', () => {
        const result = fn(renderTable);
        expect(result).toHaveProperty('containerStyle', '{containerStyle}');
      });
    });
  });
});
