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
} from './events';
import { LibraryTelemetry, type TemplateInstallDetails } from './library_telemetry';
import { LibraryFetchError, LibraryNotFoundError } from '../errors';
import type { LibraryFailure } from '../library_cache';

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
  origin: 'catalog',
  storedOrigin: {
    templateSlug: 'triage-alerts',
    templateVersion: '1.2.0',
    templateOrigin: 'catalog',
  },
  installForm,
};

const setup = ({
  cachedTemplates = [catalogRow],
  sourceMode = 'http',
}: { cachedTemplates?: Template[]; sourceMode?: 'http' | 'bundle' } = {}) => {
  const analytics = { reportEvent: jest.fn() };
  const logger = loggerMock.create();
  const library = {
    getHealth: jest.fn().mockReturnValue({ sourceMode, lastRefreshAt: null }),
    getCachedTemplates: jest.fn().mockReturnValue(cachedTemplates),
  };
  return {
    analytics,
    logger,
    library,
    telemetry: new LibraryTelemetry({ analytics, logger, library }),
  };
};

describe('registerLibraryEventTypes', () => {
  it('registers the library events', () => {
    const analytics = { registerEventType: jest.fn() };

    registerLibraryEventTypes(analytics);

    expect(analytics.registerEventType.mock.calls.map(([{ eventType }]) => eventType)).toEqual([
      TEMPLATE_INSTALLED_EVENT_TYPE,
      LIBRARY_CATALOG_FAILED_EVENT_TYPE,
    ]);
  });
});

describe('LibraryTelemetry', () => {
  describe('reportTemplateInstalled', () => {
    it('reports a catalog install with its solutions, form size and the connector types of required and optional fields', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportTemplateInstalled(catalogInstall, { id: 'workflow-1', valid: true });

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: true,
        templateOrigin: 'catalog',
        sourceMode: 'http',
        templateSlug: 'triage-alerts',
        templateVersion: '1.2.0',
        solutions: ['security'],
        formFieldCount: 4,
        connectorTypes: ['.slack', '.cases'],
        workflowId: 'workflow-1',
        workflowValid: true,
      });
    });

    it('reports an empty solution list for a cross-solution catalog template', () => {
      const { analytics, telemetry } = setup({
        cachedTemplates: [{ ...catalogRow, solutions: undefined }],
      });

      telemetry.reportTemplateInstalled(catalogInstall, { id: 'workflow-1', valid: true });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        TEMPLATE_INSTALLED_EVENT_TYPE,
        expect.objectContaining({ solutions: [] })
      );
    });

    it('reports a created workflow that failed validation', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportTemplateInstalled(catalogInstall, { id: 'workflow-1', valid: false });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        TEMPLATE_INSTALLED_EVENT_TYPE,
        expect.objectContaining({ success: true, workflowId: 'workflow-1', workflowValid: false })
      );
    });

    it('reports a remix with the template it started from, and no form', () => {
      const { analytics, telemetry } = setup({ sourceMode: 'bundle' });

      telemetry.reportTemplateInstalled(
        {
          origin: 'remix',
          storedOrigin: { templateSlug: 'triage-alerts', templateOrigin: 'remix' },
        },
        { id: 'workflow-2', valid: true }
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: true,
        templateOrigin: 'remix',
        sourceMode: 'bundle',
        templateSlug: 'triage-alerts',
        solutions: ['security'],
        workflowId: 'workflow-2',
        workflowValid: true,
      });
    });

    it('reports a remix saved while the library is off without a template', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportTemplateInstalled({ origin: 'remix' }, { id: 'workflow-3', valid: true });

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: true,
        templateOrigin: 'remix',
        sourceMode: 'http',
        workflowId: 'workflow-3',
        workflowValid: true,
      });
    });
  });

  describe('reportTemplateInstallFailed', () => {
    it('reports the field names that failed validation, once each', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
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
      const { analytics, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        catalogInstall,
        new MissingInstallFormFieldError(['threshold'])
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        TEMPLATE_INSTALLED_EVENT_TYPE,
        expect.objectContaining({ errorType: 'missing_form_field', invalidFields: ['threshold'] })
      );
    });

    it('never reports the field names or connector types of an uploaded file', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        {
          origin: 'import',
          storedOrigin: { templateSlug: 'custom', templateOrigin: 'import' },
          installForm,
        },
        new InstallFormValidationError([{ field: 'acme-secret-field', reason: 'required' }])
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: false,
        templateOrigin: 'import',
        sourceMode: 'http',
        templateSlug: 'custom',
        formFieldCount: 4,
        errorType: 'form_validation',
      });
    });

    it('reports why the template could not be fetched', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        catalogInstall,
        new LibraryFetchError('body failed its integrity check', 'integrity')
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        TEMPLATE_INSTALLED_EVENT_TYPE,
        expect.objectContaining({
          success: false,
          errorType: 'fetch_failed',
          fetchErrorReason: 'integrity',
        })
      );
    });

    it('reports no template before the template is read', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        { origin: 'catalog' },
        new LibraryNotFoundError('acme-internal')
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: false,
        templateOrigin: 'catalog',
        sourceMode: 'http',
        errorType: 'template_not_found',
      });
    });

    it('reports an uploaded file that cannot be parsed as template_parse', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportTemplateInstallFailed(
        { origin: 'import' },
        new TemplateParseError('bad yaml', 'invalid-yaml')
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(TEMPLATE_INSTALLED_EVENT_TYPE, {
        success: false,
        templateOrigin: 'import',
        sourceMode: 'http',
        errorType: 'template_parse',
      });
    });
  });

  describe('reportCatalogFailed', () => {
    it('reports a catalog failure with the source mode', () => {
      const { analytics, telemetry } = setup({ sourceMode: 'bundle' });

      telemetry.reportCatalogFailed({ operation: 'catalog', reason: 'unavailable' });

      expect(analytics.reportEvent).toHaveBeenCalledWith(LIBRARY_CATALOG_FAILED_EVENT_TYPE, {
        operation: 'catalog',
        fetchErrorReason: 'unavailable',
        sourceMode: 'bundle',
      });
    });

    it('reports which template body failed to load', () => {
      const { analytics, telemetry } = setup();

      telemetry.reportCatalogFailed({
        operation: 'template',
        reason: 'integrity',
        templateSlug: 'triage-alerts',
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(LIBRARY_CATALOG_FAILED_EVENT_TYPE, {
        operation: 'template',
        fetchErrorReason: 'integrity',
        sourceMode: 'http',
        templateSlug: 'triage-alerts',
      });
    });

    it('sends only the event fields, whatever else the failure carries', () => {
      const { analytics, telemetry } = setup();
      const failure = {
        operation: 'catalog',
        reason: 'connection',
        message: 'Failed to reach https://mirror.acme.internal/v1',
      } as LibraryFailure;

      telemetry.reportCatalogFailed(failure);

      expect(analytics.reportEvent).toHaveBeenCalledWith(LIBRARY_CATALOG_FAILED_EVENT_TYPE, {
        operation: 'catalog',
        fetchErrorReason: 'connection',
        sourceMode: 'http',
      });
    });
  });

  it('logs instead of throwing when the event cannot be reported', () => {
    const { analytics, logger, telemetry } = setup();
    analytics.reportEvent.mockImplementation(() => {
      throw new Error('event type not registered');
    });

    expect(() =>
      telemetry.reportTemplateInstalled(catalogInstall, { id: 'id', valid: true })
    ).not.toThrow();
    expect(() =>
      telemetry.reportCatalogFailed({ operation: 'catalog', reason: 'timeout' })
    ).not.toThrow();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('event type not registered'));
  });
});
