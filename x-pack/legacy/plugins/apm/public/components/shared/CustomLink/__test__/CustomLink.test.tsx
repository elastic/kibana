/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { CustomLink } from '../';
import { render, fireEvent } from '@testing-library/react';
import {
  expectTextsInDocument,
  MockApmPluginContextWrapper
} from '../../../../utils/testHelpers';
import * as hooks from '../../../../hooks/useFetcher';
import { act } from '@testing-library/react-hooks';
import { Transaction } from '../../../../../../../../plugins/apm/typings/es_schemas/ui/transaction';

describe('Custom links menu', () => {
  describe('without custom links', () => {
    beforeAll(() => {
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: [],
        status: 'success'
      });
    });
    afterAll(() => {
      jest.clearAllMocks();
    });
    it('shows empty message', () => {
      const component = render(
        <MockApmPluginContextWrapper>
          <CustomLink />
        </MockApmPluginContextWrapper>
      );
      expectTextsInDocument(component, [
        'No custom links found. Set up your own custom links i.e. a link to a specific Dashboard or external link.'
      ]);
    });
  });

  describe('with custom link', () => {
    beforeAll(() => {
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: [
          {
            id: '1',
            label: 'label 1',
            url: 'http://www.elastic.co'
          },
          {
            id: '2',
            label: 'label 2',
            url: 'http://www.elastic.co',
            'service.name': 'opbeans-java'
          }
        ],
        status: 'success'
      });
    });

    it('shows list with custom links', () => {
      const component = render(
        <MockApmPluginContextWrapper>
          <CustomLink />
        </MockApmPluginContextWrapper>
      );
      expectTextsInDocument(component, ['label 1', 'label 2']);
    });
  });

  describe('create a new custom link', () => {
    beforeAll(() => {
      spyOn(hooks, 'useFetcher').and.returnValue({
        data: [],
        status: 'success'
      });
    });
    it('opens flyout when push create button', () => {
      const { getByText, queryByText } = render(
        <MockApmPluginContextWrapper>
          <CustomLink />
        </MockApmPluginContextWrapper>
      );
      expect(queryByText('Create link')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(getByText('Create'));
      });
      expect(queryByText('Create link')).toBeInTheDocument();
    });

    it('opens flyout with filters prefilled', () => {
      const filters = {
        'service.name': 'opbeans-java',
        'service.environment': 'production',
        'transaction.type': 'request',
        'transaction.name': 'foo'
      };
      const { getByText, queryByText, getByTestId } = render(
        <MockApmPluginContextWrapper>
          <CustomLink
            transaction={
              ({
                service: {
                  name: filters['service.name'],
                  environment: filters['service.environment']
                },
                transaction: {
                  name: filters['transaction.name'],
                  type: filters['transaction.type']
                }
              } as unknown) as Transaction
            }
          />
        </MockApmPluginContextWrapper>
      );
      expect(queryByText('Create link')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(getByText('Create'));
      });
      expect(queryByText('Create link')).toBeInTheDocument();
      const expectedResult = Object.entries(filters);
      for (let i = 0; i < 4; i++) {
        expect((getByTestId(`filter-${i}`) as HTMLOptionElement).value).toEqual(
          expectedResult[i][0]
        );
        expect((getByTestId(`value-${i}`) as HTMLInputElement).value).toEqual(
          expectedResult[i][1]
        );
      }
    });
  });
});
