/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deprecationsServiceMock } from '@kbn/core/public/mocks';
import type { DeprecationsServiceStart } from '@kbn/core/public';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { kibanaDeprecationsServiceHelpers } from '../service.mock';
import { setupEnvironment } from '../../helpers/setup_environment';
import { setupKibanaPage } from '../kibana_deprecations.helpers';

describe('Kibana deprecations - Deprecations table', () => {
  let deprecationService: jest.Mocked<DeprecationsServiceStart>;

  const {
    mockedKibanaDeprecations,
    mockedCriticalKibanaDeprecations,
    mockedWarningKibanaDeprecations,
    mockedConfigKibanaDeprecations,
  } = kibanaDeprecationsServiceHelpers.defaultMockedResponses;

  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpSetup = mockEnvironment.httpSetup;
    deprecationService = deprecationsServiceMock.createStartContract();
  });

  const setup = async (overrides?: Record<string, unknown>) => {
    kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService });

    await setupKibanaPage(httpSetup, {
      services: {
        core: {
          deprecations: deprecationService,
        },
      },
      ...overrides,
    });

    await screen.findByTestId('kibanaDeprecationsTable');
  };

  test('renders deprecations', async () => {
    await setup();

    expect(screen.getByTestId('kibanaDeprecations')).toBeInTheDocument();
    const table = screen.getByTestId('kibanaDeprecationsTable');
    expect(within(table).getAllByTestId('row')).toHaveLength(mockedKibanaDeprecations.length);
  });

  it('refreshes deprecation data', async () => {
    await setup();

    expect(deprecationService.getAllDeprecations).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('refreshButton'));

    await waitFor(() => {
      expect(deprecationService.getAllDeprecations).toHaveBeenCalledTimes(2);
    });
  });

  it('shows critical and warning deprecations count', async () => {
    await setup();

    expect(screen.getByTestId('criticalDeprecationsCount')).toHaveTextContent(
      String(mockedCriticalKibanaDeprecations.length)
    );
    expect(screen.getByTestId('warningDeprecationsCount')).toHaveTextContent(
      String(mockedWarningKibanaDeprecations.length)
    );
  });

  describe('Search bar', () => {
    const clickFilterByTitle = async (title: string) => {
      await waitFor(() => {
        const filterButton: HTMLElement | null = document.body.querySelector(
          `.euiSelectableListItem[title="${title}"]`
        );

        expect(filterButton).not.toBeNull();
        filterButton!.click();
      });
    };

    it('filters by "critical" status', async () => {
      await setup();

      // Show only critical deprecations
      fireEvent.click(screen.getByRole('button', { name: 'Status Selection' }));
      await clickFilterByTitle('Critical');
      await waitFor(() => {
        expect(screen.getAllByTestId('row')).toHaveLength(mockedCriticalKibanaDeprecations.length);
      });

      // Show all deprecations (toggle off)
      fireEvent.click(screen.getByRole('button', { name: 'Status Selection' }));
      await clickFilterByTitle('Critical');
      await waitFor(() => {
        expect(screen.getAllByTestId('row')).toHaveLength(mockedKibanaDeprecations.length);
      });
    });

    it('filters by type', async () => {
      await setup();

      fireEvent.click(screen.getByRole('button', { name: 'Type Selection' }));
      await clickFilterByTitle('Config');

      await waitFor(() => {
        expect(screen.getAllByTestId('row')).toHaveLength(mockedConfigKibanaDeprecations.length);
      });
    });
  });

  describe('No deprecations', () => {
    beforeEach(async () => {
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response: [] });
      await setupKibanaPage(httpSetup, {
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });
    });

    test('renders prompt', () => {
      expect(screen.getByTestId('noDeprecationsPrompt')).toBeInTheDocument();
      expect(screen.getByTestId('noDeprecationsPrompt')).toHaveTextContent(
        'Your Kibana configuration is up to date'
      );
    });
  });
});
