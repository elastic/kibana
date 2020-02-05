/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TransactionActionMenu } from '../TransactionActionMenu';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import * as Transactions from './mockData';
import { MockApmPluginContextWrapper } from '../../../../utils/testHelpers';

const renderTransaction = async (transaction: Record<string, any>) => {
  const rendered = render(
    <TransactionActionMenu transaction={transaction as Transaction} />,
    { wrapper: MockApmPluginContextWrapper }
  );

  fireEvent.click(rendered.getByText('Actions'));

  return rendered;
};

describe('TransactionActionMenu component', () => {
  it('should always render the discover link', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('View sample document')).not.toBeNull();
  });

  it('should always render the trace logs link', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Trace logs')).not.toBeNull();
  });

  it('should not render the pod links when there is no pod id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Pod logs')).toBeNull();
    expect(queryByText('Pod metrics')).toBeNull();
  });

  it('should render the pod links when there is a pod id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithKubernetesData
    );

    expect(queryByText('Pod logs')).not.toBeNull();
    expect(queryByText('Pod metrics')).not.toBeNull();
  });

  it('should not render the container links when there is no container id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Container logs')).toBeNull();
    expect(queryByText('Container metrics')).toBeNull();
  });

  it('should render the container links when there is a container id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithContainerData
    );

    expect(queryByText('Container logs')).not.toBeNull();
    expect(queryByText('Container metrics')).not.toBeNull();
  });

  it('should not render the host links when there is no hostname', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Host logs')).toBeNull();
    expect(queryByText('Host metrics')).toBeNull();
  });

  it('should render the host links when there is a hostname', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithHostData
    );

    expect(queryByText('Host logs')).not.toBeNull();
    expect(queryByText('Host metrics')).not.toBeNull();
  });

  it('should not render the uptime link if there is no url available', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Status')).toBeNull();
  });

  it('should not render the uptime link if there is no domain available', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithUrlWithoutDomain
    );

    expect(queryByText('Status')).toBeNull();
  });

  it('should render the uptime link if there is a url with a domain', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithUrlAndDomain
    );

    expect(queryByText('Status')).not.toBeNull();
  });

  it('should match the snapshot', async () => {
    const { container } = await renderTransaction(
      Transactions.transactionWithAllData
    );

    expect(container).toMatchSnapshot();
  });
});
