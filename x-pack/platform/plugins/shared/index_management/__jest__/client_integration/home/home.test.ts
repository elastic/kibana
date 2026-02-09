/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within } from '@testing-library/react';

import { setupEnvironment } from '../helpers/setup_environment';
import { renderHome } from '../helpers/render_home';

jest.mock('react-use/lib/useObservable', () => () => jest.fn());

describe('<IndexManagementHome />', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ httpRequestsMockHelpers, httpSetup } = setupEnvironment());
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadIndicesResponse([]);

      await renderHome(httpSetup);

      await screen.findByTestId('appTitle');
    });

    test('should set the correct app title', () => {
      expect(screen.getByTestId('appTitle')).toBeInTheDocument();
      expect(screen.getByTestId('appTitle')).toHaveTextContent('Index Management');
    });

    test('should have a link to the documentation', () => {
      expect(screen.getByTestId('documentationLink')).toBeInTheDocument();
      expect(screen.getByTestId('documentationLink')).toHaveTextContent('Index Management docs');
    });

    describe('tabs', () => {
      test('should have 5 tabs', () => {
        const indexManagementHeader = screen.getByTestId('indexManagementHeaderContent');
        const tabs = within(indexManagementHeader).getAllByRole('tab');

        const expectedTabLabels = [
          'Indices',
          'Data Streams',
          'Index Templates',
          'Component Templates',
          'Enrich Policies',
        ];

        expect(tabs).toHaveLength(5);
        expectedTabLabels.forEach((label, index) => {
          expect(tabs[index]).toHaveTextContent(label);
        });
      });

      test('should navigate to Index Templates tab', async () => {
        expect(screen.getByTestId('indicesList')).toBeInTheDocument();
        expect(screen.queryByTestId('templateList')).not.toBeInTheDocument();

        httpRequestsMockHelpers.setLoadTemplatesResponse({ templates: [], legacyTemplates: [] });

        // Click on Index Templates tab (Section.IndexTemplates = 'templates')
        fireEvent.click(screen.getByTestId('templatesTab'));

        await screen.findByTestId('templateList');

        expect(screen.queryByTestId('indicesList')).not.toBeInTheDocument();
        expect(screen.getByTestId('templateList')).toBeInTheDocument();
      });
    });
  });
});
