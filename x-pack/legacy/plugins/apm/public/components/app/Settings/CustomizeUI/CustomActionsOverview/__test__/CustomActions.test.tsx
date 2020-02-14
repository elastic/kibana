/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { CustomActionsOverview } from '../';
import { expectTextsInDocument } from '../../../../../../utils/testHelpers';
import * as hooks from '../../../../../../hooks/useFetcher';

describe('CustomActions', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('empty prompt', () => {
    it('shows when any actions are available', () => {
      // TODO: mock return items
      const component = render(<CustomActionsOverview />);
      expectTextsInDocument(component, ['No actions found.']);
    });
    it('opens flyout when click to create new action', () => {
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: [],
        status: 'success'
      });
      const { queryByText, getByText } = render(<CustomActionsOverview />);
      expect(queryByText('Service')).not.toBeInTheDocument();
      fireEvent.click(getByText('Create custom action'));
      expect(queryByText('Service')).toBeInTheDocument();
    });
  });
});
