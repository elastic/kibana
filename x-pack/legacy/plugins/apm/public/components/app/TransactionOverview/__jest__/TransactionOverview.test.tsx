/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createHistory from 'history/createHashHistory';
import React from 'react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { queryByLabelText, render } from 'react-testing-library';
import { TransactionOverview } from '..';
// @ts-ignore
import configureStore from '../../../../store/config/configureStore';
import { IUrlParams } from '../../../../store/urlParams';

function setup(props: {
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}) {
  const store = configureStore();
  const history = createHistory();
  history.replace = jest.fn();

  const { container } = render(
    <Provider store={store}>
      <Router history={history}>
        <TransactionOverview {...props} />
      </Router>
    </Provider>
  );

  return { container, history };
}

describe('TransactionOverviewView', () => {
  describe('when no transaction type is given', () => {
    it('should render null', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          serviceName: 'MyServiceName'
        }
      });
      expect(container).toMatchInlineSnapshot(`<div />`);
    });

    it('should redirect to first type', () => {
      const { history } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          serviceName: 'MyServiceName'
        }
      });
      expect(history.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/MyServiceName/transactions/firstType'
        })
      );
    });
  });

  const FILTER_BY_TYPE_LABEL = 'Filter by type';

  describe('when transactionType is selected and multiple transaction types are given', () => {
    it('should render dropdown with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          transactionType: 'secondType',
          serviceName: 'MyServiceName'
        }
      });

      expect(
        queryByLabelText(container, FILTER_BY_TYPE_LABEL)
      ).toMatchSnapshot();
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
