/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, screen, within } from '@testing-library/react';

import { setupEnvironment } from '../helpers/setup_environment';
import { setupElasticsearchPage } from './es_deprecations.helpers';
import { esDeprecationsMockResponse, MOCK_SNAPSHOT_ID, MOCK_JOB_ID } from './mocked_responses';

describe('Default deprecation flyout', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
      nodeId: 'my_node',
      snapshotId: MOCK_SNAPSHOT_ID,
      jobId: MOCK_JOB_ID,
      status: 'idle',
    });
    httpRequestsMockHelpers.setReindexStatusResponse('reindex_index', {
      reindexOp: null,
      warnings: [],
      hasRequiredPrivileges: true,
      meta: {
        indexName: 'foo',
        reindexName: 'reindexed-foo',
        aliases: [],
      },
    });
  });

  test('renders a flyout with deprecation details', async () => {
    const multiFieldsDeprecation = esDeprecationsMockResponse.migrationsDeprecations[2];
    await setupElasticsearchPage(httpSetup);

    fireEvent.click(screen.getAllByTestId('deprecation-default')[0]);

    const flyout = await screen.findByTestId('defaultDeprecationDetails');

    expect(within(flyout).getByTestId('flyoutTitle')).toHaveTextContent(
      multiFieldsDeprecation.message
    );
    expect(
      (within(flyout).getByTestId('documentationLink') as HTMLAnchorElement).getAttribute('href')
    ).toBe(multiFieldsDeprecation.url);
    expect(within(flyout).getByTestId('flyoutDescription')).toHaveTextContent(
      String(multiFieldsDeprecation.index)
    );
  });
});
