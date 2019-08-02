/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, fireEvent, cleanup } from 'react-testing-library';
import 'react-testing-library/cleanup-after-each';
import { TransactionActionMenu } from '../TransactionActionMenu';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import * as Transactions from './mockData';
import * as apmIndexPatternHooks from '../../../../hooks/useAPMIndexPattern';
import * as coreHoooks from '../../../../hooks/useCore';
import { ISavedObject } from '../../../../services/rest/savedObjects';
import { InternalCoreStart } from 'src/core/public';

jest.mock('ui/kfetch');

const renderTransaction = async (transaction: Record<string, any>) => {
  const rendered = render(
    <TransactionActionMenu transaction={transaction as Transaction} />
  );

  fireEvent.click(rendered.getByText('Actions'));

  return rendered;
};

describe('TransactionActionMenu component', () => {
  beforeEach(() => {
    const coreMock = ({
      http: {
        basePath: {
          prepend: (path: string) => `/basepath${path}`
        }
      }
    } as unknown) as InternalCoreStart;

    jest
      .spyOn(apmIndexPatternHooks, 'useAPMIndexPattern')
      .mockReturnValue({ id: 'foo' } as ISavedObject);
    jest.spyOn(coreHoooks, 'useCore').mockReturnValue(coreMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

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

    expect(queryByText('Show trace logs')).not.toBeNull();
  });

  it('should not render the pod links when there is no pod id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Show pod logs')).toBeNull();
    expect(queryByText('Show pod metrics')).toBeNull();
  });

  it('should render the pod links when there is a pod id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithKubernetesData
    );

    expect(queryByText('Show pod logs')).not.toBeNull();
    expect(queryByText('Show pod metrics')).not.toBeNull();
  });

  it('should not render the container links when there is no container id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Show container logs')).toBeNull();
    expect(queryByText('Show container metrics')).toBeNull();
  });

  it('should render the container links when there is a container id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithContainerData
    );

    expect(queryByText('Show container logs')).not.toBeNull();
    expect(queryByText('Show container metrics')).not.toBeNull();
  });

  it('should not render the host links when there is no hostname', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Show host logs')).toBeNull();
    expect(queryByText('Show host metrics')).toBeNull();
  });

  it('should render the host links when there is a hostname', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithHostData
    );

    expect(queryByText('Show host logs')).not.toBeNull();
    expect(queryByText('Show host metrics')).not.toBeNull();
  });

  it('should not render the uptime link if there is no url available', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('View monitor status')).toBeNull();
  });

  it('should not render the uptime link if there is no domain available', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithUrlWithoutDomain
    );

    expect(queryByText('View monitor status')).toBeNull();
  });

  it('should render the uptime link if there is a url with a domain', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithUrlAndDomain
    );

    expect(queryByText('View monitor status')).not.toBeNull();
  });

  it('should match the snapshot', async () => {
    const { container } = await renderTransaction(
      Transactions.transactionWithAllData
    );

    expect(container).toMatchSnapshot();
  });
});
