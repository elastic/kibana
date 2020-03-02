/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { CustomLinkOverview } from '../';
import * as hooks from '../../../../../../hooks/useFetcher';
import {
  expectTextsInDocument,
  MockApmPluginContextWrapper
} from '../../../../../../utils/testHelpers';

describe('CustomLink', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('empty prompt', () => {
    beforeAll(() => {
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: [],
        status: 'success'
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
    });
    it('shows when no link is available', () => {
      const component = render(<CustomLinkOverview />);
      expectTextsInDocument(component, ['No links found.']);
    });
    it('opens flyout when click to create new link', () => {
      const { queryByText, getByText } = render(
        <MockApmPluginContextWrapper>
          <CustomLinkOverview />
        </MockApmPluginContextWrapper>
      );
      expect(queryByText('Create link')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(getByText('Create custom link'));
      });
      expect(queryByText('Create link')).toBeInTheDocument();
    });
  });

  describe('overview', () => {
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

    it('shows a table with all custom link', () => {
      const component = render(
        <MockApmPluginContextWrapper>
          <CustomLinkOverview />
        </MockApmPluginContextWrapper>
      );
      expectTextsInDocument(component, [
        'label 1',
        'url 1',
        'label 2',
        'url 2'
      ]);
    });

    it('checks if create custom link button is available and working', () => {
      const { queryByText, getByText } = render(
        <MockApmPluginContextWrapper>
          <CustomLinkOverview />
        </MockApmPluginContextWrapper>
      );
      expect(queryByText('Create link')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(getByText('Create custom link'));
      });
      expect(queryByText('Create link')).toBeInTheDocument();
    });

    it('opens flyout to edit a custom link', () => {
      const component = render(
        <MockApmPluginContextWrapper>
          <CustomLinkOverview />
        </MockApmPluginContextWrapper>
      );
      expect(component.queryByText('Create link')).not.toBeInTheDocument();
      const editButtons = component.getAllByLabelText('Edit');
      expect(editButtons.length).toEqual(2);
      act(() => {
        fireEvent.click(editButtons[0]);
      });
      expect(component.queryByText('Create link')).toBeInTheDocument();
    });
  });

  describe('Flyout', () => {
    const openFlyout = () => {
      const component = render(
        <MockApmPluginContextWrapper>
          <CustomLinkOverview />
        </MockApmPluginContextWrapper>
      );
      expect(component.queryByText('Create link')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(component.getByText('Create custom link'));
      });
      expect(component.queryByText('Create link')).toBeInTheDocument();
      return component;
    };

    describe('Filters', () => {
      const addFilterField = (
        component: ReturnType<typeof openFlyout>,
        amount: number
      ) => {
        for (let i = 1; i <= amount; i++) {
          fireEvent.click(component.getByText('Add another filter'));
        }
      };
      it('checks if add filter button is disabled after all elements have been added', () => {
        const component = openFlyout();
        expect(component.getAllByText('service.name').length).toEqual(1);
        addFilterField(component, 1);
        expect(component.getAllByText('service.name').length).toEqual(2);
        addFilterField(component, 2);
        expect(component.getAllByText('service.name').length).toEqual(4);
        // After 4 items, the button is disabled
        // Even adding a new filter, it still has only 4 items.
        addFilterField(component, 2);
        expect(component.getAllByText('service.name').length).toEqual(4);
      });
    });
  });
});
