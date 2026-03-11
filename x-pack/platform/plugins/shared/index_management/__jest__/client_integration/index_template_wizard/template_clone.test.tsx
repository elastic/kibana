/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';

import { API_BASE_PATH } from '../../../common/constants';
import { setupEnvironment } from '../helpers/setup_environment';
import {
  DEFAULT_INDEX_PATTERNS_FOR_CLONE,
  completeStep,
  renderTemplateClone,
  templateToClone,
} from './template_clone.helpers';

jest.mock('@kbn/code-editor');

describe('<TemplateClone />', () => {
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    const env = setupEnvironment();
    httpSetup = env.httpSetup;
    httpRequestsMockHelpers = env.httpRequestsMockHelpers;
    httpRequestsMockHelpers.setLoadTelemetryResponse({});
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
    httpRequestsMockHelpers.setLoadTemplateResponse(templateToClone.name, templateToClone);
  });

  describe('page title', () => {
    beforeEach(async () => {
      renderTemplateClone(httpSetup);
      await screen.findByTestId('pageTitle');
    });

    test('should set the correct page title', () => {
      expect(screen.getByTestId('pageTitle')).toBeInTheDocument();
      expect(screen.getByTestId('pageTitle')).toHaveTextContent(
        `Clone template '${templateToClone.name}'`
      );
    });
  });

  describe('form payload', () => {
    beforeEach(async () => {
      renderTemplateClone(httpSetup);
      await screen.findByTestId('pageTitle');

      // Logistics
      // Specify index patterns, but do not change name (keep default)
      await completeStep.one({
        indexPatterns: DEFAULT_INDEX_PATTERNS_FOR_CLONE,
      });
      // Component templates
      await completeStep.two();
      // Index settings
      await completeStep.three();
      // Mappings
      await completeStep.four();
      // Aliases
      await completeStep.five();
    }, 20000);

    it('should send the correct payload', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('nextButton')).toBeEnabled();
      });
      fireEvent.click(screen.getByTestId('nextButton'));

      const { template, indexMode, priority, version, _kbnMeta, allowAutoCreate } = templateToClone;
      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/index_templates`,
          expect.objectContaining({
            body: JSON.stringify({
              name: `${templateToClone.name}-copy`,
              indexPatterns: DEFAULT_INDEX_PATTERNS_FOR_CLONE,
              priority,
              version,
              allowAutoCreate,
              indexMode,
              _kbnMeta,
              template,
            }),
          })
        );
      });
    }, 20000);
  });
});
