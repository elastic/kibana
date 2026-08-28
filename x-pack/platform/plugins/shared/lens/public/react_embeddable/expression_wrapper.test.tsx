/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { ReactExpressionRendererProps } from '@kbn/expressions-plugin/public';
import { ExpressionWrapper } from './expression_wrapper';
import { getValidExpressionParams } from './mocks';

const GRID_ERROR = new Error(
  "Value 'grid' is not among the allowed options for argument 'layout': 'list'"
);

function renderWrapper(ui: React.ReactElement) {
  return render(ui, { wrapper: EuiProvider });
}

describe('ExpressionWrapper', () => {
  it('should not re-report a runtime error when the renderer re-renders the same error UI', () => {
    const onRuntimeError = jest.fn();
    const Renderer = ({ renderError }: ReactExpressionRendererProps) => (
      <>{renderError?.(GRID_ERROR.message, GRID_ERROR)}</>
    );

    const props = getValidExpressionParams({
      ExpressionRenderer: Renderer,
      onRuntimeError,
    });
    const { rerender } = renderWrapper(<ExpressionWrapper {...props} />);

    expect(onRuntimeError).toHaveBeenCalledTimes(1);

    rerender(<ExpressionWrapper {...props} />);

    expect(onRuntimeError).toHaveBeenCalledTimes(1);
  });
});
