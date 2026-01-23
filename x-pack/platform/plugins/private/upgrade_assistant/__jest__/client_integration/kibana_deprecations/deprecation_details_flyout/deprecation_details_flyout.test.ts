/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deprecationsServiceMock } from '@kbn/core/public/mocks';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { setupEnvironment } from '../../helpers/setup_environment';
import { kibanaDeprecationsServiceHelpers } from '../service.mock';
import { setupKibanaPage } from '../kibana_deprecations.helpers';

describe('Kibana deprecations - Deprecation details flyout', () => {
  const {
    defaultMockedResponses: { mockedKibanaDeprecations },
  } = kibanaDeprecationsServiceHelpers;
  const deprecationService = deprecationsServiceMock.createStartContract();
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpSetup = mockEnvironment.httpSetup;

    kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService });

    await setupKibanaPage(httpSetup, {
      services: {
        core: {
          deprecations: deprecationService,
        },
      },
    });

    await screen.findByTestId('kibanaDeprecationsTable');
  });

  const openDeprecationAt = async (index: number) => {
    const table = screen.getByTestId('kibanaDeprecationsTable');
    const rows = within(table).getAllByTestId('row');
    const row = rows[index];
    fireEvent.click(within(row).getByTestId('deprecationDetailsLink'));
    return await screen.findByTestId('kibanaDeprecationDetails');
  };

  describe('Deprecation with manual steps', () => {
    test('renders flyout with single manual step as a standalone paragraph', async () => {
      const manualDeprecation = mockedKibanaDeprecations[1];

      const flyout = await openDeprecationAt(0);

      expect(flyout).toBeInTheDocument();
      expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(manualDeprecation.title);
      expect(screen.getAllByTestId('manualStep')).toHaveLength(1);
    });

    test('renders flyout with multiple manual steps as a list', async () => {
      const manualDeprecation = mockedKibanaDeprecations[1];

      const flyout = await openDeprecationAt(1);

      expect(flyout).toBeInTheDocument();
      expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(manualDeprecation.title);
      expect(screen.getAllByTestId('manualStepsListItem')).toHaveLength(3);
    });

    test(`doesn't show corrective actions title and steps if there aren't any`, async () => {
      const manualDeprecation = mockedKibanaDeprecations[2];

      const flyout = await openDeprecationAt(2);

      expect(flyout).toBeInTheDocument();
      expect(screen.queryByTestId('manualStepsTitle')).not.toBeInTheDocument();
      expect(screen.queryByTestId('manualStepsListItem')).not.toBeInTheDocument();
      expect(screen.getByTestId('flyoutTitle')).toHaveTextContent(manualDeprecation.title);
    });
  });

  test('Shows documentationUrl when present', async () => {
    const deprecation = mockedKibanaDeprecations[1];

    const flyout = await openDeprecationAt(1);
    const docLink = within(flyout).getByTestId('documentationLink') as HTMLAnchorElement;
    expect(docLink.getAttribute('href')).toBe(deprecation.documentationUrl);
  });

  describe('Deprecation with automatic resolution', () => {
    test('resolves deprecation successfully', async () => {
      const quickResolveDeprecation = mockedKibanaDeprecations[0];

      const flyout = await openDeprecationAt(0);
      expect(within(flyout).getByTestId('criticalDeprecationBadge')).toBeInTheDocument();
      expect(within(flyout).getByTestId('flyoutTitle')).toHaveTextContent(
        quickResolveDeprecation.title
      );

      // Quick resolve callout and button should display
      expect(within(flyout).getByTestId('quickResolveCallout')).toBeInTheDocument();
      expect(within(flyout).getByTestId('resolveButton')).toBeInTheDocument();

      fireEvent.click(within(flyout).getByTestId('resolveButton'));

      await waitFor(() => {
        expect(screen.queryByTestId('kibanaDeprecationDetails')).not.toBeInTheDocument();
      });

      // Reopen the flyout
      const reopenedFlyout = await openDeprecationAt(0);

      // Resolve information should not display and Quick resolve button should be disabled
      expect(within(reopenedFlyout).queryByTestId('resolveSection')).not.toBeInTheDocument();
      expect(within(reopenedFlyout).queryByTestId('resolveButton')).not.toBeInTheDocument();
      expect(within(reopenedFlyout).getByTestId('resolvedDeprecationBadge')).toBeInTheDocument();
    });

    test('handles resolve failure', async () => {
      const quickResolveDeprecation = mockedKibanaDeprecations[0];

      kibanaDeprecationsServiceHelpers.setResolveDeprecations({
        deprecationService,
        status: 'fail',
      });

      const flyout = await openDeprecationAt(0);
      expect(within(flyout).getByTestId('criticalDeprecationBadge')).toBeInTheDocument();
      expect(within(flyout).getByTestId('flyoutTitle')).toHaveTextContent(
        quickResolveDeprecation.title
      );

      // Quick resolve callout and button should display
      expect(within(flyout).getByTestId('quickResolveCallout')).toBeInTheDocument();
      expect(within(flyout).getByTestId('resolveButton')).toBeInTheDocument();

      fireEvent.click(within(flyout).getByTestId('resolveButton'));
      await waitFor(() => {
        expect(screen.queryByTestId('kibanaDeprecationDetails')).not.toBeInTheDocument();
      });

      // Reopen the flyout
      const reopenedFlyout = await openDeprecationAt(0);

      expect(within(reopenedFlyout).getByTestId('quickResolveError')).toBeInTheDocument();
      expect(within(reopenedFlyout).getByTestId('resolveSection')).toBeInTheDocument();
      expect(within(reopenedFlyout).getByTestId('criticalDeprecationBadge')).toBeInTheDocument();
      expect(within(reopenedFlyout).getByTestId('resolveButton')).toBeEnabled();
      expect(within(reopenedFlyout).getByTestId('resolveButton')).toHaveTextContent('Try again');
    });
  });
});
