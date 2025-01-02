/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import { useAgentPoliciesSpaces } from '../../../../../../hooks/use_request/spaces';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { SpaceSelector } from './space_selector';

jest.mock('../../../../../../hooks/use_request/spaces');

describe('Space Selector', () => {
  beforeEach(() => {
    jest.mocked(useAgentPoliciesSpaces).mockReturnValue({
      data: {
        items: [
          {
            name: 'Default',
            id: 'default',
          },
          {
            name: 'Test',
            id: 'test',
          },
        ],
      },
    } as any);
  });
  function render() {
    const renderer = createFleetTestRendererMock();
    const onChange = jest.fn();
    const setInvalidSpaceError = jest.fn();
    const result = renderer.render(
      <SpaceSelector setInvalidSpaceError={setInvalidSpaceError} onChange={onChange} value={[]} />
    );

    return {
      result,
      onChange,
      setInvalidSpaceError,
    };
  }

  it('should render invalid space errors', () => {
    const { result, onChange, setInvalidSpaceError } = render();
    const inputEl = result.getByTestId('comboBoxSearchInput');
    fireEvent.change(inputEl, {
      target: { value: 'invalidSpace' },
    });
    fireEvent.keyDown(inputEl, { key: 'Enter', code: 'Enter' });
    expect(result.container).toHaveTextContent('invalidSpace is not a valid space.');
    expect(onChange).not.toBeCalled();
    expect(setInvalidSpaceError).toBeCalledWith(true);
  });

  it('should clear invalid space errors', () => {
    const { result, setInvalidSpaceError } = render();
    const inputEl = result.getByTestId('comboBoxSearchInput');
    fireEvent.change(inputEl, {
      target: { value: 'invalidSpace' },
    });
    fireEvent.keyDown(inputEl, { key: 'Enter', code: 'Enter' });
    expect(result.container).toHaveTextContent('invalidSpace is not a valid space.');
    fireEvent.change(inputEl, {
      target: { value: '' },
    });
    fireEvent.keyDown(inputEl, { key: 'Enter', code: 'Enter' });
    expect(result.container).not.toHaveTextContent('invalidSpace is not a valid space.');
    expect(setInvalidSpaceError).toBeCalledWith(false);
  });

  it('should accept valid space', () => {
    const { result, onChange, setInvalidSpaceError } = render();
    const inputEl = result.getByTestId('comboBoxSearchInput');
    fireEvent.change(inputEl, {
      target: { value: 'test' },
    });
    fireEvent.keyDown(inputEl, { key: 'Enter', code: 'Enter' });
    expect(result.container).not.toHaveTextContent('test is not a valid space.');
    expect(onChange).toBeCalledWith(['test']);
    expect(setInvalidSpaceError).not.toBeCalledWith(true);
  });
});
