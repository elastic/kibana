/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deprecationsServiceMock } from '@kbn/core/public/mocks';

import { APP_LOGS_COUNT_CLUSTER_PRIVILEGES } from '../../../../common/constants';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { setupEnvironment } from '../../helpers/setup_environment';
import { kibanaDeprecationsServiceHelpers } from '../service.mock';
import { setupKibanaPage } from '../kibana_deprecations.helpers';

describe('Kibana deprecations - Deprecations table - Error handling', () => {
  const deprecationService = deprecationsServiceMock.createStartContract();

  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpSetup = mockEnvironment.httpSetup;
  });

  test('handles plugin errors', async () => {
    kibanaDeprecationsServiceHelpers.setLoadDeprecations({
      deprecationService,
      response: [
        ...kibanaDeprecationsServiceHelpers.defaultMockedResponses.mockedKibanaDeprecations,
        {
          domainId: 'failed_plugin_id_1',
          title: 'Failed to fetch deprecations for "failed_plugin_id"',
          message: `Failed to get deprecations info for plugin "failed_plugin_id".`,
          level: 'fetch_error',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
        {
          domainId: 'failed_plugin_id_1',
          title: 'Failed to fetch deprecations for "failed_plugin_id"',
          message: `Failed to get deprecations info for plugin "failed_plugin_id".`,
          level: 'fetch_error',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
        {
          domainId: 'failed_plugin_id_2',
          title: 'Failed to fetch deprecations for "failed_plugin_id"',
          message: `Failed to get deprecations info for plugin "failed_plugin_id".`,
          level: 'fetch_error',
          correctiveActions: {
            manualSteps: ['Check Kibana server logs for error message.'],
          },
        },
      ],
    });

    await setupKibanaPage(httpSetup, {
      services: {
        core: {
          deprecations: deprecationService,
        },
      },
      privileges: {
        hasAllPrivileges: true,
        missingPrivileges: {
          cluster: [...APP_LOGS_COUNT_CLUSTER_PRIVILEGES],
          index: [],
        },
      },
    });

    expect(screen.getByTestId('kibanaDeprecationErrors')).toBeInTheDocument();
    expect(screen.getByTestId('kibanaDeprecationErrors')).toHaveTextContent(
      'Failed to get deprecation issues for these plugins: failed_plugin_id_1, failed_plugin_id_2.'
    );
    expect(screen.getByTestId('kibanaDeprecationErrors')).toHaveTextContent(
      'Certain issues might be missing due to missing cluster privilege for: manage_security'
    );
  });

  test('handles request error', async () => {
    kibanaDeprecationsServiceHelpers.setLoadDeprecations({
      deprecationService,
      mockRequestErrorMessage: 'Internal Server Error',
    });

    await setupKibanaPage(httpSetup, {
      services: {
        core: {
          deprecations: deprecationService,
        },
      },
    });

    expect(screen.getByTestId('deprecationsPageLoadingError')).toHaveTextContent(
      'Could not retrieve Kibana deprecation issues'
    );
  });
});
