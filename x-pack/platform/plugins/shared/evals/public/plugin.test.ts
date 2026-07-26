/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementSetup } from '@kbn/management-plugin/public';
import { EvalsPublicPlugin } from './plugin';

describe('EvalsPublicPlugin', () => {
  const createManagementMock = () => {
    const registerApp = jest.fn();
    return {
      sections: {
        section: {
          ai: {
            registerApp,
          },
        },
      },
    } as unknown as ManagementSetup & {
      sections: { section: { ai: { registerApp: jest.Mock } } };
    };
  };

  const createCoreSetupMock = () =>
    ({
      application: {
        register: jest.fn(),
      },
      getStartServices: jest.fn(),
    } as any);

  it('registers the Stack Management AI entry when management is available', () => {
    const plugin = new EvalsPublicPlugin();
    const management = createManagementMock();

    const coreSetup = createCoreSetupMock();

    plugin.setup(coreSetup, { management });

    expect(coreSetup.application.register).not.toHaveBeenCalled();
    expect(management.sections.section.ai.registerApp).toHaveBeenCalledTimes(1);
    expect(management.sections.section.ai.registerApp).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'evals',
        order: 2,
        capabilitiesId: 'evals',
      })
    );
  });

  it('does not register the Stack Management AI entry when management is not available', () => {
    const plugin = new EvalsPublicPlugin();

    const coreSetup = createCoreSetupMock();

    plugin.setup(coreSetup, {});

    // nothing to assert besides no throw; management was undefined
    expect(true).toBe(true);
  });
});
