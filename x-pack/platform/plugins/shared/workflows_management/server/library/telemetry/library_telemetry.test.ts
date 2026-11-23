/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { InstallFormField, Template } from '@kbn/workflows-library';
import {
  InstallFormValidationError,
  MissingInstallFormFieldError,
  TemplateParseError,
} from '@kbn/workflows-library';

import {
  LIBRARY_CATALOG_FAILED_EVENT_TYPE,
  registerLibraryEventTypes,
  TEMPLATE_INSTALLED_EVENT_TYPE,
  TEMPLATE_LOAD_FAILED_EVENT_TYPE,
} from './events';
import { LibraryTelemetry, type TemplateInstallDetails } from './library_telemetry';
import { LibraryFetchError, LibraryNotFoundError } from '../errors';

const catalogRow: Template = {
  slug: 'triage-alerts',
  version: '1.2.0',
  availability: '>=9.5.0',
  name: 'Triage alerts',
  description: 'Triages alerts',
  categories: ['utility'],
  solutions: ['security'],
  definitionUrl: 'templates/triage-alerts/1.2.0.yaml',
  contentHash: `sha256:${'0'.repeat(64)}`,
  stepTypes: [],
  triggerTypes: [],
};

const installForm: InstallFormField[] = [
  { name: 'slack', inputType: 'connector', connectorType: '.slack', required: true },
  { name: 'slack-backup', inputType: 'connector', connectorType: '.slack' },
  { name: 'cases', inputType: 'connector', connectorType: '.cases' },
  { name: 'index', inputType: 'esIndex', required: true },
];

const catalogInstall: TemplateInstallDetails = {
  source: 'catalog',
  templateOrigin: {
    templateSlug: 'triage-alerts',
    templateVersion: '1.2.0',
    templateOrigin: 'install',
  },
  installForm,
};

const setup = ({ cachedTemplates = [catalogRow] }: { cachedTemplates?: Template[] } = {}) => {
  const analytics = { reportEvent: jest.fn() };
  const logger = loggerMock.create();
  const library = {
    getHealth: jest.fn().mockReturnValue({ sourceMode: 'http', lastRefreshAt: null }),
    getCachedTemplates: jest.fn().mockReturnValue(cachedTemplates),
  };
  return { analytics, logger, library, telemetry: new LibraryTelemetry(analytics, logger) };
};

describe('registerLibraryEventTypes', () => {
  it('registers the three library events', () => {
    const analytics = { registerEventType: jest.fn() };

    registerLibraryEventTypes(analytics);

    expect(analytics.registerEventType.mock.calls.map(([{ eventType }]) => eventType)).toEqual([
      TEMPLATE_INSTALLED_EVENT_TYPE,
      LIBRARY_CATALOG_FAILED_EVENT_TYPE,
      TEMPLATE_LOAD_FAILED_EVENT_TYPE,
    ]);
  });
});

describe('LibraryTelemetry', () => {
  describe('reportTemplateInstalled', () => {
    it('reports a catalog install with its solutions, form size and connector types', () => {
      const { analytics, library, telemetry } = setup();

      telemetry.reportTemplateInstalled(library, catalogInstall, 'workflow-1');

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: true,
        source: 'catalog',
        sourceMode: 'http',
        templateSlug: 'triage-alerts',
        templateVersion: '1.2.0',
        solutions: ['security'],
        formFieldCount: 4,
        requiredConnectorTypes: ['.slack', '.cases'],
        workflowId: 'workflow-1',
      });
    });

    it('reports an empty solution list for a cross-solution catalog template', () => {
      const { analytics, library, telemetry } = setup({
        cachedTemplates: [{ ...catalogRow, solutions: undefined }],
      });

      telemetry.reportTemplateInstalled(library, catalogInstall, 'workflow-1');

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        TEMPLATE_INSTALLED_EVENT_TYPE,
        expect.objectContaining({ solutions: [] })
      );
    });

    it('never reports the field names or connector types of an uploaded file', () => {
      const { analytics, library, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        library,
        {
          source: 'file',
          templateOrigin: { templateSlug: 'custom', templateOrigin: 'import' },
          installForm,
        },
        new InstallFormValidationError([{ field: 'acme-secret-field', reason: 'required' }])
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: false,
        source: 'file',
        sourceMode: 'http',
        templateSlug: 'custom',
        formFieldCount: 4,
        errorType: 'form_validation',
      });
    });
  });

  describe('reportTemplateInstallFailed', () => {
    it('reports the field names that failed validation, once each', () => {
      const { analytics, library, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        library,
        catalogInstall,
        new InstallFormValidationError([
          { field: 'index', reason: 'required' },
          { field: 'index', reason: 'not a string' },
          { field: 'slack', reason: 'required' },
        ])
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        TEMPLATE_INSTALLED_EVENT_TYPE,
        expect.objectContaining({
          success: false,
          errorType: 'form_validation',
          invalidFields: ['index', 'slack'],
        })
      );
    });

    it('reports the fields the template body uses but its form does not declare', () => {
      const { analytics, library, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        library,
        catalogInstall,
        new MissingInstallFormFieldError(['threshold'])
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        TEMPLATE_INSTALLED_EVENT_TYPE,
        expect.objectContaining({ errorType: 'missing_form_field', invalidFields: ['threshold'] })
      );
    });

    it('reports no template before the template is read', () => {
      const { analytics, library, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        library,
        { source: 'catalog' },
        new LibraryNotFoundError('acme-internal')
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: false,
        source: 'catalog',
        sourceMode: 'http',
        errorType: 'template_not_found',
      });
    });

    it('reports an uploaded file that cannot be parsed as template_parse', () => {
      const { analytics, library, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        library,
        { source: 'file' },
        new TemplateParseError('bad yaml', 'invalid-yaml')
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: false,
        source: 'file',
        sourceMode: 'http',
        errorType: 'template_parse',
      });
    });
  });

  describe('reportTemplateLoadFailed', () => {
    it('reports a slug that is not in the catalog as not_found, without the slug', () => {
      const { analytics, library, telemetry } = setup();

      telemetry.reportTemplateLoadFailed(
        library,
        'acme-internal',
        new LibraryNotFoundError('acme-internal')
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_LOAD_FAILED_EVENT_TYPE, {
        reason: 'not_found',
      });
    });

    it('reports a catalog template whose body failed to load with its slug', () => {
      const { analytics, library, telemetry } = setup();

      telemetry.reportTemplateLoadFailed(
        library,
        'triage-alerts',
        new LibraryFetchError('body failed', 'integrity')
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_LOAD_FAILED_EVENT_TYPE, {
        reason: 'fetch_error',
        templateSlug: 'triage-alerts',
      });
    });

    it('leaves the slug out when no catalog was available to check it', () => {
      const { analytics, library, telemetry } = setup();
      library.getCachedTemplates.mockReturnValue(undefined);

      telemetry.reportTemplateLoadFailed(
        library,
        'triage-alerts',
        new LibraryFetchError('catalog down', 'unavailable')
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_LOAD_FAILED_EVENT_TYPE, {
        reason: 'fetch_error',
      });
    });

    it('reports nothing for an error that is not about loading the template', () => {
      const { analytics, library, telemetry } = setup();

      telemetry.reportTemplateLoadFailed(library, 'triage-alerts', new Error('boom'));

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });
  });

  describe('reportCatalogFailed', () => {
    it('reports the failure as it is', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportCatalogFailed({
        operation: 'catalog',
        reason: 'timeout',
        sourceMode: 'http',
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(LIBRARY_CATALOG_FAILED_EVENT_TYPE, {
        operation: 'catalog',
        reason: 'timeout',
        sourceMode: 'http',
      });
    });
  });

  it('logs instead of throwing when the event cannot be reported', () => {
    const { analytics, logger, library, telemetry } = setup();
    analytics.reportEvent.mockImplementation(() => {
      throw new Error('event type not registered');
    });

    expect(() => telemetry.reportTemplateInstalled(library, catalogInstall, 'id')).not.toThrow();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event type not registered'));
  });
});
