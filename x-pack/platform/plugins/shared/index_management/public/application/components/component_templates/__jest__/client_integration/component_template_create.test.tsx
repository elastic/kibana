/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitFor } from '@testing-library/react';

import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import { setupEnvironment } from './helpers';
import { API_BASE_PATH } from './helpers/constants';
import {
  completeStep,
  renderComponentTemplateCreate,
} from './helpers/component_template_create.helpers';
import { serializeAsESLifecycle } from '../../../../../../common/lib';
import { runPendingTimersUntil } from '../../../../../../__jest__/helpers/fake_timers';

jest.mock('@kbn/code-editor');

describe('<ComponentTemplateCreate />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeAll(() => {
    jest.spyOn(breadcrumbService, 'setBreadcrumbs');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const env = setupEnvironment();
    httpSetup = env.httpSetup;
    httpRequestsMockHelpers = env.httpRequestsMockHelpers;
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

  // FLAKY: https://github.com/elastic/kibana/issues/253349
  // FLAKY: https://github.com/elastic/kibana/issues/253454
  // FLAKY: https://github.com/elastic/kibana/issues/253535
  describe.skip('Step: Review and submit', () => {
    const COMPONENT_TEMPLATE_NAME = 'comp-1';
    const SETTINGS = { number_of_shards: 1 };
    const ALIASES = { my_alias: {} };
    const LIFECYCLE = {
      enabled: true,
      value: 2,
      unit: 'd',
    };

    const BOOLEAN_MAPPING_FIELD = {
      name: 'boolean_datatype',
      type: 'boolean',
    };

    beforeEach(async () => {
      renderComponentTemplateCreate(httpSetup);
      await screen.findByTestId('pageTitle');

      // Complete step 1 (logistics)
      await completeStep.logistics({
        name: COMPONENT_TEMPLATE_NAME,
        lifecycle: LIFECYCLE,
      });

      // Complete step 2 (index settings)
      await completeStep.settings(JSON.stringify(SETTINGS));

      // Complete step 3 (mappings)
      await completeStep.mappings([BOOLEAN_MAPPING_FIELD]);

      // Complete step 4 (aliases)
      await completeStep.aliases(JSON.stringify(ALIASES));

      await screen.findByTestId('stepReview');
    });

    test('should render the review content', async () => {
      // Verify page header
      expect(screen.getByTestId('stepReview')).toBeInTheDocument();
      expect(screen.getByTestId('stepReview')).toHaveTextContent(
        `Review details for '${COMPONENT_TEMPLATE_NAME}'`
      );

      // Verify 2 tabs exist
      const reviewContent = screen.getByTestId('stepReview');
      const tabs = within(reviewContent).getAllByRole('tab');
      expect(tabs).toHaveLength(2);
      expect(tabs.map((t) => t.textContent)).toEqual(['Summary', 'Request']);

      // Summary tab should render by default
      expect(screen.getByTestId('summaryTab')).toBeInTheDocument();
      expect(screen.queryByTestId('requestTab')).not.toBeInTheDocument();

      // Navigate to request tab and verify content
      fireEvent.click(screen.getByRole('tab', { name: 'Request' }));

      await waitFor(() => {
        expect(screen.queryByTestId('summaryTab')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('requestTab')).toBeInTheDocument();
    });

    test('should send the correct payload when submitting the form', async () => {
      fireEvent.click(screen.getByTestId('nextButton'));

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/component_templates`,
          expect.objectContaining({
            body: JSON.stringify({
              name: COMPONENT_TEMPLATE_NAME,
              template: {
                settings: SETTINGS,
                mappings: {
                  properties: {
                    [BOOLEAN_MAPPING_FIELD.name]: {
                      type: BOOLEAN_MAPPING_FIELD.type,
                    },
                  },
                },
                aliases: ALIASES,
                lifecycle: serializeAsESLifecycle(LIFECYCLE),
              },
              _kbnMeta: { usedBy: [], isManaged: false },
            }),
          })
        );
      });
    });

    test('should surface API errors if the request is unsuccessful', async () => {
      const error = {
        statusCode: 409,
        error: 'Conflict',
        message: `There is already a template with name '${COMPONENT_TEMPLATE_NAME}'`,
      };

      httpRequestsMockHelpers.setCreateComponentTemplateResponse(undefined, error);

      fireEvent.click(screen.getByTestId('nextButton'));

      expect(await screen.findByTestId('saveComponentTemplateError')).toBeInTheDocument();
      expect(screen.getByTestId('saveComponentTemplateError')).toHaveTextContent(error.message);
    });
  });
});
