/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';

import { setupEnvironment } from '../helpers/setup_environment';
import { setupElasticsearchPage } from './es_deprecations.helpers';

describe('Error handling', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  it('handles 403', async () => {
    const error = {
      statusCode: 403,
      error: 'Forbidden',
      message: 'Forbidden',
    };

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

    await setupElasticsearchPage(httpSetup);

    expect(await screen.findByTestId('deprecationsPageLoadingError')).toHaveTextContent(
      'You are not authorized to view Elasticsearch deprecation issues.'
    );
  });

  it('shows upgraded message when all nodes have been upgraded', async () => {
    const error = {
      statusCode: 426,
      error: 'Upgrade required',
      message: 'There are some nodes running a different version of Elasticsearch',
      attributes: {
        // This is marked true in the scenario where none of the nodes have the same major version of Kibana,
        // and therefore we assume all have been upgraded
        allNodesUpgraded: true,
      },
    };

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

    await setupElasticsearchPage(httpSetup);

    expect(await screen.findByTestId('deprecationsPageLoadingError')).toHaveTextContent(
      'All Elasticsearch nodes have been upgraded.'
    );
  });

  it('shows partially upgrade error when nodes are running different versions', async () => {
    const error = {
      statusCode: 426,
      error: 'Upgrade required',
      message: 'There are some nodes running a different version of Elasticsearch',
      attributes: {
        allNodesUpgraded: false,
      },
    };

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

    await setupElasticsearchPage(httpSetup);

    expect(await screen.findByTestId('deprecationsPageLoadingError')).toHaveTextContent(
      'Upgrade Kibana to the same version as your Elasticsearch cluster. One or more nodes in the cluster is running a different version than Kibana.'
    );
  });

  it('handles generic error', async () => {
    const error = {
      statusCode: 500,
      error: 'Internal server error',
      message: 'Internal server error',
    };

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

    await setupElasticsearchPage(httpSetup);

    expect(await screen.findByTestId('deprecationsPageLoadingError')).toHaveTextContent(
      'Could not retrieve Elasticsearch deprecation issues.'
    );
  });
});
