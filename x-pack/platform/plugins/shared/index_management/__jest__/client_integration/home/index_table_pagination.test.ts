/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { screen, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { EuiPaginationTestHarness } from '@kbn/test-eui-helpers';

import { setupEnvironment } from '../helpers/setup_environment';
import { renderHome } from '../helpers/render_home';
import { httpService } from '../../../public/application/services/http';
import { createNonDataStreamIndex } from '../helpers/actions/data_stream_actions';

jest.mock('react-use/lib/useObservable', () => () => jest.fn());

describe('Index table pagination', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    jest.clearAllMocks();

    const mockEnvironment = setupEnvironment();
    httpService.setup(httpServiceMock.createSetupContract());
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  const createIndices = (count: number) => {
    return Array.from({ length: count }, (_, i) => {
      const name = `index-${String(i).padStart(3, '0')}`;
      return createNonDataStreamIndex(name);
    });
  };

  it('honors pageIndex from URL params', async () => {
    httpRequestsMockHelpers.setLoadIndicesResponse(createIndices(25));

    await renderHome(httpSetup, {
      initialEntries: ['/indices?includeHiddenIndices=true&pageSize=10&pageIndex=1'],
    });

    // Wait for the async indices load to settle (real timers).
    await screen.findByText('index-010');

    expect(screen.getByText('index-010')).toBeInTheDocument();
    expect(screen.queryByText('index-000')).not.toBeInTheDocument();
  });

  it('changes pages when a pagination button is clicked', async () => {
    httpRequestsMockHelpers.setLoadIndicesResponse(createIndices(25));

    await renderHome(httpSetup, {
      initialEntries: ['/indices?includeHiddenIndices=true&pageSize=10'],
    });

    // Wait for the async indices load to settle (real timers).
    await screen.findByText('index-000');
    expect(screen.queryByText('index-010')).not.toBeInTheDocument();

    const pagination = new EuiPaginationTestHarness();
    pagination.click('2');

    await waitFor(() => {
      expect(screen.getByText('index-010')).toBeInTheDocument();
      expect(screen.queryByText('index-000')).not.toBeInTheDocument();
    });
  });

  it('honors pageSize from URL params', async () => {
    httpRequestsMockHelpers.setLoadIndicesResponse(createIndices(25));

    await renderHome(httpSetup, {
      initialEntries: ['/indices?includeHiddenIndices=true&pageSize=50'],
    });

    // Wait for the async indices load to settle (real timers).
    await screen.findByText('index-000');

    expect(screen.getAllByTestId('indexTableIndexNameLink')).toHaveLength(25);
  });
});
