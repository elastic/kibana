/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { getSettings } from '../../settings';
import { appContextService } from '../../app_context';

import { getIntegrationKnowledgeSetting } from './get_integration_knowledge_setting';

vi.mock('../../settings');

vi.mock('../../app_context');

describe('getIntegrationKnowledgeSetting', () => {
  const mockSoClient = {} as Mocked<SavedObjectsClientContract>;

  it('should return true if feature flag is enabled and no user setting', async () => {
    (appContextService.getExperimentalFeatures as Mock).mockReturnValue({
      installIntegrationsKnowledge: true,
    });
    (getSettings as Mock).mockResolvedValue({});

    const result = await getIntegrationKnowledgeSetting(mockSoClient);
    expect(result).toBe(true);
  });

  it('should return false if config is disabled and no user setting', async () => {
    (appContextService.getConfig as Mock).mockReturnValue({
      experimentalFeatures: {
        integrationKnowledge: false,
      },
    });
    (appContextService.getExperimentalFeatures as Mock).mockReturnValue({
      installIntegrationsKnowledge: true,
    });
    (getSettings as Mock).mockResolvedValue({});

    const result = await getIntegrationKnowledgeSetting(mockSoClient);
    expect(result).toBe(false);
  });

  it('should return false if feature flag is enabled and user setting is disabled', async () => {
    (appContextService.getExperimentalFeatures as Mock).mockReturnValue({
      installIntegrationsKnowledge: true,
    });
    (getSettings as Mock).mockResolvedValue({
      integration_knowledge_enabled: false,
    });

    const result = await getIntegrationKnowledgeSetting(mockSoClient);
    expect(result).toBe(false);
  });

  it('should return false if experimental feature flag is disabled and user setting is enabled', async () => {
    (appContextService.getConfig as Mock).mockReturnValue(null);
    (appContextService.getExperimentalFeatures as Mock).mockReturnValue({
      installIntegrationsKnowledge: false,
    });
    (getSettings as Mock).mockResolvedValue({
      integration_knowledge_enabled: true,
    });

    const result = await getIntegrationKnowledgeSetting(mockSoClient);
    expect(result).toBe(false);
  });

  it('should return false if top-level installIntegrationsKnowledge is false and user setting is enabled', async () => {
    (appContextService.getConfig as Mock).mockReturnValue({
      installIntegrationsKnowledge: false,
    });
    (appContextService.getExperimentalFeatures as Mock).mockReturnValue({
      installIntegrationsKnowledge: true,
    });
    (getSettings as Mock).mockResolvedValue({
      integration_knowledge_enabled: true,
    });

    const result = await getIntegrationKnowledgeSetting(mockSoClient);
    expect(result).toBe(false);
  });

  it('should return true if top-level installIntegrationsKnowledge is true and user setting is enabled', async () => {
    (appContextService.getConfig as Mock).mockReturnValue({
      installIntegrationsKnowledge: true,
    });
    (appContextService.getExperimentalFeatures as Mock).mockReturnValue({
      installIntegrationsKnowledge: true,
    });
    (getSettings as Mock).mockResolvedValue({
      integration_knowledge_enabled: true,
    });

    const result = await getIntegrationKnowledgeSetting(mockSoClient);
    expect(result).toBe(true);
  });

  it('should return false if config is disabled and user setting is enabled', async () => {
    (appContextService.getConfig as Mock).mockReturnValue({
      experimentalFeatures: {
        integrationKnowledge: false,
      },
    });
    (appContextService.getExperimentalFeatures as Mock).mockReturnValue({
      installIntegrationsKnowledge: true,
    });
    (getSettings as Mock).mockResolvedValue({
      integration_knowledge_enabled: true,
    });

    const result = await getIntegrationKnowledgeSetting(mockSoClient);
    expect(result).toBe(false);
  });
});
