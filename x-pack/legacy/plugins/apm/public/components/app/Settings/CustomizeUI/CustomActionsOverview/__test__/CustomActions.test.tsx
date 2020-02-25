/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { fireEvent, render, getAllByLabelText } from '@testing-library/react';
import { CustomActionsOverview } from '../';
import {
  expectTextsInDocument,
  MockApmPluginContextWrapper
} from '../../../../../../utils/testHelpers';
import * as hooks from '../../../../../../hooks/useFetcher';

describe('CustomActions', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('empty prompt page', () => {
    beforeAll(() => {
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: [],
        status: 'success'
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });
    it('shows when no action is available', () => {
      const component = render(<CustomActionsOverview />);
      expectTextsInDocument(component, ['No actions found.']);
    });
    it('opens flyout when click to create new action', () => {
      const { queryByText, getByText } = render(
        <MockApmPluginContextWrapper>
          <CustomActionsOverview />
        </MockApmPluginContextWrapper>
      );
      expect(queryByText('Create action')).not.toBeInTheDocument();
      fireEvent.click(getByText('Create custom action'));
      expect(queryByText('Create action')).toBeInTheDocument();
    });
  });

  describe('overview page', () => {
    beforeAll(() => {
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: [
          {
            id: '1',
            label: 'label 1',
            url: 'url 1',
            filters: {
              'service.name': 'opbeans-java'
            }
          },
          {
            id: '2',
            label: 'label 2',
            url: 'url 2',
            filters: {
              'transaction.type': 'request'
            }
          }
        ],
        status: 'success'
      });
    });

    it('shows a table with all custom actions', () => {
      const component = render(
        <MockApmPluginContextWrapper>
          <CustomActionsOverview />
        </MockApmPluginContextWrapper>
      );
      expectTextsInDocument(component, [
        'label 1',
        'url 1',
        'label 2',
        'url 2'
      ]);
      // expect(queryByText('Create action')).not.toBeInTheDocument();
    });

    it('checks if create custom action button is available and working', () => {
      const { queryByText, getByText } = render(
        <MockApmPluginContextWrapper>
          <CustomActionsOverview />
        </MockApmPluginContextWrapper>
      );
      expect(queryByText('Create action')).not.toBeInTheDocument();
      fireEvent.click(getByText('Create custom action'));
      expect(queryByText('Create action')).toBeInTheDocument();
    });

    it('opens flyout to edit a custom action', () => {
      const container = render(
        <MockApmPluginContextWrapper>
          <CustomActionsOverview />
        </MockApmPluginContextWrapper>
      );
      expect(container.queryByText('Create action')).not.toBeInTheDocument();
      const editButtons = container.getAllByLabelText('Edit');
      expect(editButtons.length).toEqual(2);
      fireEvent.click(editButtons[0]);
      expect(container.queryByText('Create action')).toBeInTheDocument();
    });
  });
});
