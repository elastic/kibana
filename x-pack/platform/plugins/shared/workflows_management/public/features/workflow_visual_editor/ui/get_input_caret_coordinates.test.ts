/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInputCaretCoordinates } from './get_input_caret_coordinates';

describe('getInputCaretCoordinates', () => {
  let input: HTMLInputElement;

  beforeEach(() => {
    input = document.createElement('input');
    input.value = 'hello world';
    input.style.fontSize = '13px';
    input.style.paddingTop = '7px';
    input.style.borderLeftWidth = '3px';
    document.body.appendChild(input);
  });

  afterEach(() => {
    input.remove();
  });

  it('measures on an off-screen mirror that carries the input styles, then removes it', () => {
    const appendChild = jest.spyOn(document.body, 'appendChild');

    getInputCaretCoordinates(input, 5);

    const mirror = appendChild.mock.calls
      .map(([node]) => node)
      .find(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node.id === 'workflow-input-caret-mirror'
      );
    appendChild.mockRestore();

    expect(mirror).toBeDefined();
    expect(mirror?.style.getPropertyValue('font-size')).toBe('13px');
    expect(mirror?.style.getPropertyValue('padding-top')).toBe('7px');
    expect(mirror?.style.getPropertyValue('border-left-width')).toBe('3px');
    expect(mirror?.style.position).toBe('absolute');
    expect(document.getElementById('workflow-input-caret-mirror')).toBeNull();
  });
});
