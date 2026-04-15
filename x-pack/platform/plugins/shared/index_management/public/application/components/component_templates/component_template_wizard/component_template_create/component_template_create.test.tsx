/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import { setupEnvironment } from '../../__jest__/client_integration/helpers';
import { renderComponentTemplateCreate } from './__jest__/component_template_create.helpers';
import { runPendingTimersUntil } from '../../../../../../__jest__/helpers/fake_timers';
import type { ComponentTemplateDeserialized } from '../../../../../../common';
import { serializeAsESLifecycle } from '../../../../../../common/lib';
import { StepReview } from '../component_template_form/steps/step_review';

jest.mock('@kbn/code-editor');

describe('<ComponentTemplateCreate />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeAll(() => {
    jest.spyOn(breadcrumbService, 'setBreadcrumbs');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const env = setupEnvironment();
    httpSetup = env.httpSetup;
  });

  describe('On component mount', () => {
    beforeEach(async () => {
      renderComponentTemplateCreate(httpSetup);
      await screen.findByTestId('pageTitle');
    });

    test('updates the breadcrumbs to component templates', () => {
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenLastCalledWith(
        IndexManagementBreadcrumb.componentTemplateCreate
      );
    });

    test('should set the correct page header', async () => {
      // Verify page title
      expect(screen.getByTestId('pageTitle')).toBeInTheDocument();
      expect(screen.getByTestId('pageTitle')).toHaveTextContent('Create component template');

      // Verify documentation link
      expect(screen.getByTestId('documentationLink')).toBeInTheDocument();
      expect(screen.getByTestId('documentationLink')).toHaveTextContent('Component Templates docs');
    });

    describe('Step: Logistics', () => {
      test('should toggle the metadata field', async () => {
        // Meta editor should be hidden by default
        expect(screen.queryByTestId('metaEditor')).not.toBeInTheDocument();

        // Find the switch by test ID and click it directly
        const metaToggle = screen.getByTestId('metaToggle');
        // The switch might be a button or input - try clicking the element directly
        fireEvent.click(metaToggle);

        await screen.findByTestId('metaEditor');
        expect(screen.getByTestId('metaEditor')).toBeInTheDocument();
      });

      test('should toggle the data retention field', async () => {
        expect(screen.queryByTestId('valueDataRetentionField')).not.toBeInTheDocument();

        const lifecycleSwitchRow = screen.getByTestId('dataRetentionToggle');
        const lifecycleSwitch = within(lifecycleSwitchRow).getByRole('switch');
        fireEvent.click(lifecycleSwitch);

        await runPendingTimersUntil(() => screen.queryByTestId('valueDataRetentionField') !== null);
        expect(screen.getByTestId('valueDataRetentionField')).toBeInTheDocument();
      });

      describe('Validation', () => {
        test('should require a name', async () => {
          // Submit logistics step without any values
          fireEvent.click(screen.getByTestId('nextButton'));

          await screen.findByText('A component template name is required.');
          expect(screen.getByTestId('nextButton')).toBeDisabled();
        });
      });
    });
  });

  describe('Step: Review and submit', () => {
    test('should render the review content', async () => {
      const componentTemplate: ComponentTemplateDeserialized = {
        name: 'comp-1',
        template: {
          settings: { number_of_shards: 1 },
          aliases: { my_alias: {} },
          mappings: { properties: { boolean_datatype: { type: 'boolean' } } },
          lifecycle: serializeAsESLifecycle({ enabled: true, value: 2, unit: 'd' }),
        },
        _kbnMeta: { usedBy: [], isManaged: false },
      };

      render(
        <I18nProvider>
          <StepReview componentTemplate={componentTemplate} />
        </I18nProvider>
      );

      expect(screen.getByTestId('stepReview')).toBeInTheDocument();
      expect(screen.getByTestId('stepReview')).toHaveTextContent(`Review details for 'comp-1'`);

      const tabs = within(screen.getByTestId('stepReview')).getAllByRole('tab');
      expect(tabs).toHaveLength(2);
      expect(tabs.map((t) => t.textContent)).toEqual(['Summary', 'Request']);

      // Summary tab should render by default
      expect(screen.getByTestId('summaryTab')).toBeInTheDocument();
      expect(screen.queryByTestId('requestTab')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('tab', { name: 'Request' }));

      await waitFor(() => {
        expect(screen.queryByTestId('summaryTab')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('requestTab')).toBeInTheDocument();
    });
  });
});
