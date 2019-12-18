/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  queryByLabelText,
  render,
  getByText,
  getByDisplayValue,
  queryByDisplayValue,
  fireEvent
} from '@testing-library/react';
import { omit } from 'lodash';
import { history } from '../../../../utils/history';
import { TransactionOverview } from '..';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import * as useServiceTransactionTypesHook from '../../../../hooks/useServiceTransactionTypes';
import { fromQuery } from '../../../shared/Links/url_helpers';
import { Router } from 'react-router-dom';
import { UrlParamsProvider } from '../../../../context/UrlParamsContext';
import { MockApmPluginContextWrapper } from '../../../../utils/testHelpers';

jest.spyOn(history, 'push');
jest.spyOn(history, 'replace');

jest.mock('ui/new_platform');
function setup({
  urlParams,
  serviceTransactionTypes
}: {
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}) {
  const defaultLocation = {
    pathname: '/services/foo/transactions',
    search: fromQuery(omit(urlParams, 'serviceName'))
  } as any;

  history.replace({
    ...defaultLocation
  });

  jest
    .spyOn(useServiceTransactionTypesHook, 'useServiceTransactionTypes')
    .mockReturnValue(serviceTransactionTypes);

  return render(
    <MockApmPluginContextWrapper>
      <Router history={history}>
        <UrlParamsProvider>
          <TransactionOverview />
        </UrlParamsProvider>
      </Router>
    </MockApmPluginContextWrapper>
  );
}

describe('TransactionOverview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no transaction type is given', () => {
    it('should redirect to first type', () => {
      setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          serviceName: 'MyServiceName'
        }
      });
      expect(history.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'transactionType=firstType'
        })
      );
    });
  });

  const FILTER_BY_TYPE_LABEL = 'Transaction type';

  describe('when transactionType is selected and multiple transaction types are given', () => {
    it('should render dropdown with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          transactionType: 'secondType',
          serviceName: 'MyServiceName'
        }
      });

      // secondType is selected in the dropdown
      expect(queryByDisplayValue(container, 'secondType')).not.toBeNull();
      expect(queryByDisplayValue(container, 'firstType')).toBeNull();

      expect(getByText(container, 'firstType')).not.toBeNull();
    });

    it('should update the URL when a transaction type is selected', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          transactionType: 'secondType',
          serviceName: 'MyServiceName'
        }
      });

      expect(queryByDisplayValue(container, 'firstType')).toBeNull();

      fireEvent.change(getByDisplayValue(container, 'secondType'), {
        target: { value: 'firstType' }
      });

      expect(history.push).toHaveBeenCalled();

      getByDisplayValue(container, 'firstType');

      expect(queryByDisplayValue(container, 'firstType')).not.toBeNull();
    });
  });

  describe('when a transaction type is selected, and there are no other transaction types', () => {
    it('should not render a dropdown with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType'],
        urlParams: {
          transactionType: 'firstType',
          serviceName: 'MyServiceName'
        }
      });

      expect(queryByLabelText(container, FILTER_BY_TYPE_LABEL)).toBeNull();
    });
  });
});
