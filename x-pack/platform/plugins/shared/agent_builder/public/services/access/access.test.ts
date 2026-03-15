/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { AgentBuilderAccessChecker } from './access';

describe('AgentBuilderAccessChecker', () => {
  const createLicensing = ({
    isActive = true,
    hasAtLeast = true,
  }: {
    isActive?: boolean;
    hasAtLeast?: boolean;
  }): LicensingPluginStart =>
    ({
      license$: new BehaviorSubject({
        isActive,
        hasAtLeast: jest.fn().mockReturnValue(hasAtLeast),
      }),
    } as unknown as LicensingPluginStart);

  const createInference = ({
    connectors = [],
    anonymizationEnabled = false,
  }: {
    connectors?: Array<{ id: string }>;
    anonymizationEnabled?: boolean;
  }): InferencePublicStart =>
    ({
      getConnectors: jest.fn().mockResolvedValue({
        connectors,
        anonymizationEnabled,
      }),
    } as unknown as InferencePublicStart);

  it('derives connector and anonymization flags from connectors payload', async () => {
    const licensing = createLicensing({ isActive: true, hasAtLeast: true });
    const inference = createInference({
      connectors: [{ id: 'connector-1' }],
      anonymizationEnabled: true,
    });
    const checker = new AgentBuilderAccessChecker({ licensing, inference });

    await checker.initAccess();

    expect(checker.getAccess()).toEqual({
      hasRequiredLicense: true,
      hasLlmConnector: true,
      hasAnonymizationEnabled: true,
    });
    expect(inference.getConnectors).toHaveBeenCalledTimes(1);
  });

  it('handles disabled anonymization and missing connectors', async () => {
    const licensing = createLicensing({ isActive: true, hasAtLeast: true });
    const inference = createInference({
      connectors: [],
      anonymizationEnabled: false,
    });
    const checker = new AgentBuilderAccessChecker({ licensing, inference });

    await checker.initAccess();

    expect(checker.getAccess()).toEqual({
      hasRequiredLicense: true,
      hasLlmConnector: false,
      hasAnonymizationEnabled: false,
    });
  });

  it('throws a wrapped error when access resolution fails', async () => {
    const licensing = createLicensing({ isActive: true, hasAtLeast: true });
    const inference = {
      getConnectors: jest.fn().mockRejectedValue(new Error('connectors failed')),
    } as unknown as InferencePublicStart;
    const checker = new AgentBuilderAccessChecker({ licensing, inference });

    await expect(checker.initAccess()).rejects.toThrow('Unable to determine Agent Builder access');
  });
});
