/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';

import { setupEnvironment } from '../helpers/setup_environment';
import { setupAppPage } from './app.helpers';

describe('Privileges', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('when user is not a Kibana global admin', () => {
    beforeEach(async () => {
      await setupAppPage(httpSetup, {
        services: {
          core: {
            application: {
              capabilities: {
                spaces: {
                  manage: false,
                },
              },
            },
          },
        },
      });
    });

    test('renders not authorized message', () => {
      expect(screen.queryByTestId('overviewPageHeader')).toBeNull();
      expect(screen.getByTestId('missingKibanaPrivilegesMessage')).toBeInTheDocument();
    });
  });
});
