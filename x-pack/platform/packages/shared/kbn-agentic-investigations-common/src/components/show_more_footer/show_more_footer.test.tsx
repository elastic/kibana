/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { ShowMoreFooter } from './show_more_footer';

const renderFooter = (props: Partial<React.ComponentProps<typeof ShowMoreFooter>> = {}) => {
  const onClick = jest.fn();
  renderWithKibanaRenderContext(
    <ShowMoreFooter
      label="Show more (2)"
      onClick={onClick}
      data-test-subj="showMore"
      errorDataTestSubj="showMoreError"
      {...props}
    />
  );
  return { onClick };
};

describe('ShowMoreFooter', () => {
  it('renders the label and calls onClick when clicked', () => {
    const { onClick } = renderFooter();

    fireEvent.click(screen.getByTestId('showMore'));

    expect(screen.getByText('Show more (2)')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the aria-label when provided', () => {
    renderFooter({ ariaLabel: 'Show 2 more investigations' });

    expect(screen.getByTestId('showMore')).toHaveAttribute(
      'aria-label',
      'Show 2 more investigations'
    );
  });

  it('does not render an error message by default', () => {
    renderFooter({ errorMessage: 'Could not load more', retryLabel: 'Retry' });

    expect(screen.queryByTestId('showMoreError')).not.toBeInTheDocument();
    expect(screen.getByText('Show more (2)')).toBeInTheDocument();
  });

  it('shows the error and turns the button into a retry when hasError is set', () => {
    const { onClick } = renderFooter({
      hasError: true,
      errorMessage: 'Could not load more',
      retryLabel: 'Retry',
    });

    expect(screen.getByTestId('showMoreError')).toHaveTextContent('Could not load more');
    expect(screen.getByTestId('showMoreError')).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('showMore')).toHaveTextContent('Retry');
    expect(screen.queryByText('Show more (2)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('showMore'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps the label when hasError is set without a retry label', () => {
    renderFooter({ hasError: true });

    expect(screen.getByTestId('showMore')).toHaveTextContent('Show more (2)');
  });

  it('disables the button while loading', () => {
    renderFooter({ isLoading: true });

    expect(screen.getByTestId('showMore')).toBeDisabled();
  });
});
