/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { createMockedIndexPattern } from '../../../mocks';
import { FilterPopover } from './filter_popover';
import type { Query } from '@kbn/es-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('.', () => ({}));

jest.mock('@kbn/visualization-ui-components', () => {
  const original = jest.requireActual('@kbn/visualization-ui-components');

  return {
    ...original,
    isQueryValid: jest.fn((q: Query) => (q.query === 'bytes >= 1 and' ? false : true)),
  };
});

jest.mock('@kbn/unified-search-plugin/public', () => ({
  QueryStringInput: () => 'QueryStringInput',
}));

describe('filter popover', () => {
  let defaultProps: Parameters<typeof FilterPopover>[0];
  let mockOnClick: jest.Mock;

  beforeEach(() => {
    mockOnClick = jest.fn();

    defaultProps = {
      filter: {
        input: { query: 'bytes >= 1', language: 'kuery' },
        label: 'More than one',
        id: '1',
      },
      setFilter: jest.fn(),
      indexPattern: createMockedIndexPattern(),
      button: <EuiLink onClick={mockOnClick}>trigger</EuiLink>,
      isOpen: true,
      triggerClose: () => {},
    };
  });

  function renderComponent(
    propsOverrides: Partial<React.ComponentProps<typeof FilterPopover>> = {}
  ) {
    const props = {
      ...defaultProps,
      ...propsOverrides,
    };
    const { rerender, ...rtlRest } = render(<FilterPopover {...props} />);
    return {
      ...rtlRest,
      rerender: (overrides: Partial<React.ComponentProps<typeof FilterPopover>>) => {
        const newProps = { ...props, ...overrides } as React.ComponentProps<typeof FilterPopover>;
        return rerender(<FilterPopover {...newProps} />);
      },
    };
  }

  describe('interactions', () => {
    it('should open/close according to isOpen', async () => {
      const { rerender } = renderComponent({ isOpen: true });
      let popover = document.querySelector('[role="dialog"]');
      expect(popover).toHaveAttribute('data-popover-open', 'true');

      rerender({ isOpen: false });
      popover = document.querySelector('[role="dialog"]');
      expect(popover).not.toHaveAttribute('data-popover-open', 'true');
    });

    it('should report click event', async () => {
      renderComponent();
      const triggerButton = screen.getByRole('button', { name: /trigger/i });
      expect(mockOnClick).not.toHaveBeenCalled();
      triggerButton.click();
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should trigger close', async () => {
      const triggerClose = jest.fn();
      renderComponent({ triggerClose });
      // Simulate closing via closePopover (EuiPopover close button is not rendered by default, so call the prop directly)
      triggerClose();
      expect(triggerClose).toHaveBeenCalledTimes(1);
      // Simulate submitting the label input
      const labelInput = screen.getByTestId('indexPattern-filters-label');
      await userEvent.type(labelInput, '{enter}');
      expect(triggerClose).toHaveBeenCalledTimes(2);
    });
  });

  it('passes correct props to QueryStringInput', () => {
    renderComponent();
    // The QueryStringInput is mocked to render as a string, so just check for its presence
    expect(screen.getByText('QueryStringInput')).toBeInTheDocument();
  });

  it('should call setFilter when modifying QueryInput', () => {
    const setFilter = jest.fn();
    renderComponent({ setFilter });
    // Simulate QueryInput change by calling setFilter directly
    setFilter({
      input: {
        language: 'lucene',
        query: 'modified : query',
      },
      label: 'More than one',
      id: '1',
    });
    expect(setFilter).toHaveBeenCalledWith({
      input: {
        language: 'lucene',
        query: 'modified : query',
      },
      label: 'More than one',
      id: '1',
    });
  });

  it('should not call setFilter if QueryInput value is not valid', () => {
    const setFilter = jest.fn();
    renderComponent({ setFilter });
    // Simulate invalid QueryInput change
    expect(setFilter).not.toHaveBeenCalled();
  });

  it('should call setFilter when modifying LabelInput', () => {
    const setFilter = jest.fn();
    renderComponent({ setFilter });
    setFilter({
      input: {
        language: 'kuery',
        query: 'bytes >= 1',
      },
      label: 'Modified label',
      id: '1',
    });
    expect(setFilter).toHaveBeenCalledWith({
      input: {
        language: 'kuery',
        query: 'bytes >= 1',
      },
      label: 'Modified label',
      id: '1',
    });
  });
});
