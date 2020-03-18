/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SelectionText } from './SelectionText';
import { WaterfallSelection } from '..';

describe('SelectionText', () => {
  describe('with no selection', () => {
    it('renders with visibility:hidden', async () => {
      const selection: WaterfallSelection = [undefined, undefined];
      const resetSelection = () => {};
      const props = { resetSelection, selection };
      const element = await render(<SelectionText {...props} />).findByTestId(
        'root'
      );

      expect(element.style.visibility).toEqual('hidden');
    });
  });

  describe('with a selection', () => {
    it('renders with visibility:visible', async () => {
      const selection: WaterfallSelection = [0, 1];
      const resetSelection = () => {};
      const props = { resetSelection, selection };
      const element = await render(<SelectionText {...props} />).findByTestId(
        'root'
      );

      expect(element.style.visibility).toEqual('visible');
    });
  });
});
