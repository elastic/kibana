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

const createAccessChecker = ({
  hasEnterpriseLicense,
  connectorCount,
  connectorsReject,
}: {
  hasEnterpriseLicense: boolean;
  connectorCount: number;
  connectorsReject?: Error;
}) => {
  const licensing = {
    license$: new BehaviorSubject({
      hasAtLeast: jest.fn().mockReturnValue(hasEnterpriseLicense),
      isActive: hasEnterpriseLicense,
    }),
  } as unknown as LicensingPluginStart;

  const inference = {
    getConnectors: connectorsReject
      ? jest.fn().mockRejectedValue(connectorsReject)
      : jest
          .fn()
          .mockResolvedValue(
            Array.from({ length: connectorCount }, (_, index) => ({ id: `c-${index}` }))
          ),
  } as unknown as InferencePublicStart;

  return new AgentBuilderAccessChecker({ licensing, inference });
};

describe('AgentBuilderAccessChecker', () => {
  it('returns hasRequiredLicense false when the cluster license is not enterprise', async () => {
    const accessChecker = createAccessChecker({ hasEnterpriseLicense: false, connectorCount: 1 });

    await accessChecker.initAccess();

    expect(accessChecker.getAccess()).toEqual({
      hasRequiredLicense: false,
      hasLlmConnector: true,
    });
  });

  it('returns hasLlmConnector false when no inference connectors are configured', async () => {
    const accessChecker = createAccessChecker({ hasEnterpriseLicense: true, connectorCount: 0 });

    await accessChecker.initAccess();

    expect(accessChecker.getAccess()).toEqual({
      hasRequiredLicense: true,
      hasLlmConnector: false,
    });
  });

  it('returns both signals true when license and connectors are available', async () => {
    const accessChecker = createAccessChecker({ hasEnterpriseLicense: true, connectorCount: 1 });

    await accessChecker.initAccess();

    expect(accessChecker.getAccess()).toEqual({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    });
  });

  it('throws when connector lookup fails during initialization', async () => {
    const accessChecker = createAccessChecker({
      hasEnterpriseLicense: true,
      connectorCount: 0,
      connectorsReject: new Error('forbidden'),
    });

    await expect(accessChecker.initAccess()).rejects.toThrow(
      'Unable to determine Agent Builder access'
    );
  });

  it('throws when getAccess is called before initialization', () => {
    const accessChecker = createAccessChecker({ hasEnterpriseLicense: true, connectorCount: 1 });

    expect(() => accessChecker.getAccess()).toThrow('Agent Builder access was not initialized');
  });

  it('returns denied access when initialization fails', async () => {
    const accessChecker = createAccessChecker({
      hasEnterpriseLicense: true,
      connectorCount: 0,
      connectorsReject: new Error('forbidden'),
    });

    await expect(accessChecker.getAgentBuilderAccess()).resolves.toEqual({
      hasRequiredLicense: false,
      hasLlmConnector: false,
    });
  });

  it('returns access from getAgentBuilderAccess when initialization succeeds', async () => {
    const accessChecker = createAccessChecker({ hasEnterpriseLicense: true, connectorCount: 1 });

    await expect(accessChecker.getAgentBuilderAccess()).resolves.toEqual({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    });
  });
});
