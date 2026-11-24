/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { QueryDetailsFlyoutErrorBoundary } from './query_details_flyout_error_boundary';

describe('QueryDetailsFlyoutErrorBoundary', () => {
  it('calls onError once with the error and renders nothing when a child throws', () => {
    const error = new Error('Unable to render query details');
    const ThrowingChild = (): React.ReactElement => {
      throw error;
    };

    const onError = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { container } = render(
        <QueryDetailsFlyoutErrorBoundary onError={onError}>
          <ThrowingChild />
        </QueryDetailsFlyoutErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(container).toBeEmptyDOMElement();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('renders a non-throwing child as-is', () => {
    const onError = jest.fn();
    const { container } = render(
      <QueryDetailsFlyoutErrorBoundary onError={onError}>
        <div>Query details</div>
      </QueryDetailsFlyoutErrorBoundary>
    );

    expect(container.innerHTML).toBe('<div>Query details</div>');
    expect(onError).not.toHaveBeenCalled();
  });
});
