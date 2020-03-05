/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fireEvent, render, wait } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { CustomLinkOverview } from '../';
import * as hooks from '../../../../../../hooks/useFetcher';
import {
  expectTextsInDocument,
  MockApmPluginContextWrapper
} from '../../../../../../utils/testHelpers';
import * as saveCustomLink from '../CustomLinkFlyout/saveCustomLink';
import * as apmApi from '../../../../../../services/rest/createCallApmApi';

const data = [
  {
    id: '1',
    label: 'label 1',
    url: 'url 1',
    'service.name': 'opbeans-java'
  },
  {
    id: '2',
    label: 'label 2',
    url: 'url 2',
    'transaction.type': 'request'
  }
];

describe('CustomLink', () => {
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
        data,
        status: 'success'
      });
    });

    afterAll(() => {
      jest.clearAllMocks();
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
  });

  describe('Flyout', () => {
    const refetch = jest.fn();
    let callApmApiSpy: Function;
    let saveCustomLinkSpy: Function;
    beforeAll(() => {
      callApmApiSpy = spyOn(apmApi, 'callApmApi');
      saveCustomLinkSpy = spyOn(saveCustomLink, 'saveCustomLink');
      spyOn(hooks, 'useFetcher').and.returnValue({
        data,
        status: 'success',
        refetch
      });
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

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

    it('creates a custom link', async () => {
      const component = openFlyout();
      const labelInput = component.getByLabelText('label');
      act(() => {
        fireEvent.change(labelInput, {
          target: { value: 'foo' }
        });
      });
      const urlInput = component.getByLabelText('url');
      act(() => {
        fireEvent.change(urlInput, {
          target: { value: 'bar' }
        });
      });
      await act(async () => {
        await wait(() => fireEvent.submit(component.getByText('Save')));
      });
      expect(saveCustomLinkSpy).toHaveBeenCalledTimes(1);
    });

    it('deletes a custom link', async () => {
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
      await act(async () => {
        await wait(() => fireEvent.click(component.getByText('Delete')));
      });
      expect(callApmApiSpy).toHaveBeenCalled();
      expect(refetch).toHaveBeenCalled();
    });

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
        addFilterField(component, 2);
        expect(component.getAllByText('service.name').length).toEqual(4);
      });
      it('removes items already selected', () => {
        const component = openFlyout();

        const addFieldAndCheck = (
          fieldName: string,
          selectValue: string,
          addNewFilter: boolean,
          optionsExpected: string[]
        ) => {
          if (addNewFilter) {
            addFilterField(component, 1);
          }
          const field = component.getByLabelText(
            fieldName
          ) as HTMLSelectElement;
          const optionsAvailable = Object.values(field)
            .map(option => (option as HTMLOptionElement).text)
            .filter(option => option);

          act(() => {
            fireEvent.change(field, {
              target: { value: selectValue }
            });
          });
          expect(field.value).toEqual(selectValue);
          expect(optionsAvailable).toEqual(optionsExpected);
        };

        addFieldAndCheck('filter-0', 'transaction.name', false, [
          'Select field...',
          'service.name',
          'service.environment',
          'transaction.type',
          'transaction.name'
        ]);

        addFieldAndCheck('filter-1', 'service.name', true, [
          'Select field...',
          'service.name',
          'service.environment',
          'transaction.type'
        ]);

        addFieldAndCheck('filter-2', 'transaction.type', true, [
          'Select field...',
          'service.environment',
          'transaction.type'
        ]);

        addFieldAndCheck('filter-3', 'service.environment', true, [
          'Select field...',
          'service.environment'
        ]);
      });
    });
  });
});
