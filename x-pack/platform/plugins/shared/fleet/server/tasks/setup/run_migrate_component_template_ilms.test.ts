/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import {
  getILMMigrationStatus,
  getILMPolicies,
  saveILMMigrationChanges,
} from '../../services/epm/elasticsearch/template/default_settings';

import { appContextService } from '../../services';

import { runMigrateComponentTemplateILMs } from './run_migrate_component_template_ilms';

jest.mock('../../services/epm/elasticsearch/template/default_settings', () => {
  return {
    DATA_STREAM_TYPES_DEPRECATED_ILMS: ['logs', 'metrics', 'synthetics'],
    getILMMigrationStatus: jest.fn(),
    getILMPolicies: jest.fn(),
    saveILMMigrationChanges: jest.fn(),
  };
});

describe('runMigrateComponentTemplateILMs', () => {
  const abortController = new AbortController();
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;
  const getILMMigrationStatusMock = getILMMigrationStatus as jest.Mock;
  const saveILMMigrationChangesMock = saveILMMigrationChanges as jest.Mock;
  const getILMPoliciesMock = getILMPolicies as jest.Mock;
  const getComponentTemplateMock = jest.fn();
  const putComponentTemplateMock = jest.fn();
  const esClientMock = {
    cluster: {
      getComponentTemplate: getComponentTemplateMock,
      putComponentTemplate: putComponentTemplateMock,
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(appContextService, 'getInternalUserESClient').mockReturnValue(esClientMock);

    jest.spyOn(appContextService, 'getConfig').mockReturnValue({} as any);
  });

  it('should do nothing if ILM policies are disabled', async () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      internal: {
        disableILMPolicies: true,
      },
    } as any);

    await runMigrateComponentTemplateILMs({ abortController, logger });

    expect(getILMMigrationStatusMock).not.toHaveBeenCalled();
    expect(getILMPoliciesMock).not.toHaveBeenCalled();
    expect(getComponentTemplateMock).not.toHaveBeenCalled();
    expect(putComponentTemplateMock).not.toHaveBeenCalled();
    expect(saveILMMigrationChangesMock).not.toHaveBeenCalled();
  });

  it('should do nothing if ILM policies are modified', async () => {
    getILMMigrationStatusMock.mockResolvedValue(new Map());
    getILMPoliciesMock.mockResolvedValue(
      new Map([
        [
          'logs',
          {
            deprecatedILMPolicy: { version: 2 },
            newILMPolicy: { version: 1 },
          },
        ],
        [
          'metrics',
          {
            deprecatedILMPolicy: { version: 2 },
            newILMPolicy: { version: 1 },
          },
        ],
        [
          'synthetics',
          {
            deprecatedILMPolicy: { version: 2 },
            newILMPolicy: { version: 1 },
          },
        ],
      ])
    );

    await runMigrateComponentTemplateILMs({ abortController, logger });

    expect(getComponentTemplateMock).not.toHaveBeenCalled();
    expect(putComponentTemplateMock).not.toHaveBeenCalled();
  });

  it('should migrate component templates if ILM policies are not modified', async () => {
    getILMMigrationStatusMock.mockResolvedValue(new Map());
    getILMPoliciesMock.mockResolvedValue(
      new Map([
        [
          'logs',
          {
            deprecatedILMPolicy: { version: 1 },
            newILMPolicy: { version: 1 },
          },
        ],
        [
          'metrics',
          {
            deprecatedILMPolicy: { version: 1 },
            newILMPolicy: { version: 1 },
          },
        ],
        [
          'synthetics',
          {
            deprecatedILMPolicy: { version: 2 },
            newILMPolicy: { version: 1 },
          },
        ],
      ])
    );
    getComponentTemplateMock.mockResolvedValueOnce({
      component_templates: {
        'logs-test@package': {
          name: 'logs-test@package',
          component_template: {
            template: {
              settings: {
                index: {
                  lifecycle: {
                    name: 'logs',
                  },
                },
              },
            },
          },
        },
      },
    });
    getComponentTemplateMock.mockResolvedValueOnce({
      component_templates: {
        'metrics-test@package': {
          name: 'metrics-test@package',
          component_template: {
            template: {
              settings: {
                index: {
                  lifecycle: {
                    name: 'metrics',
                  },
                },
              },
            },
          },
        },
      },
    });

    await runMigrateComponentTemplateILMs({ abortController, logger });

    expect(putComponentTemplateMock).toHaveBeenCalledWith({
      name: 'logs-test@package',
      template: {
        settings: {
          index: {
            lifecycle: {
              name: 'logs@lifecycle',
            },
          },
        },
      },
    });
    expect(putComponentTemplateMock).toHaveBeenCalledWith({
      name: 'metrics-test@package',
      template: {
        settings: {
          index: {
            lifecycle: {
              name: 'metrics@lifecycle',
            },
          },
        },
      },
    });
    expect(saveILMMigrationChangesMock).toHaveBeenCalledWith(
      new Map([
        ['logs', 'success'],
        ['metrics', 'success'],
      ])
    );
  });

  it('should migrate component templates if ILM policies are modified and migration was done already', async () => {
    getILMMigrationStatusMock.mockResolvedValue(new Map([['metrics', 'success']]));
    getILMPoliciesMock.mockResolvedValue(
      new Map([
        [
          'logs',
          {
            deprecatedILMPolicy: { version: 2 },
            newILMPolicy: { version: 1 },
          },
        ],
        [
          'metrics',
          {
            deprecatedILMPolicy: { version: 2 },
            newILMPolicy: { version: 1 },
          },
        ],
        [
          'synthetics',
          {
            deprecatedILMPolicy: { version: 2 },
            newILMPolicy: { version: 1 },
          },
        ],
      ])
    );
    getComponentTemplateMock.mockResolvedValueOnce({
      component_templates: {
        'metrics-test@package': {
          name: 'metrics-test@package',
          component_template: {
            template: {
              settings: {
                index: {
                  lifecycle: {
                    name: 'metrics',
                  },
                },
              },
            },
          },
        },
      },
    });

    await runMigrateComponentTemplateILMs({ abortController, logger });

    expect(putComponentTemplateMock).toHaveBeenCalledWith({
      name: 'metrics-test@package',
      template: {
        settings: {
          index: {
            lifecycle: {
              name: 'metrics@lifecycle',
            },
          },
        },
      },
    });
    expect(saveILMMigrationChangesMock).toHaveBeenCalledWith(new Map([['metrics', 'success']]));
  });
});
