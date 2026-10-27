/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container } from 'inversify';
import { KibanaContainerModule, Setup, Start } from '@kbn/core-di';
import { start } from '@kbn/core-di-mocks';
import { NOTIFICATION_TYPES } from '../../common';
import { NotificationSubmitService } from '../lib/submit';
import type { NotificationCenterPluginSetup } from '../types';
import { bindContract } from './bind_contract';

const modelStatus = NOTIFICATION_TYPES.inference.modelStatus;

const content = {
  entity: 'my-endpoint',
  state: 'deprecated',
  title: 'Model deprecated',
  description: 'Your endpoint model is deprecated.',
};

// Core's `Setup` token is intentionally untyped; each plugin narrows it to its own contract.
const getSetupContract = (container: Container) =>
  container.get(Setup) as NotificationCenterPluginSetup;

const createContainer = () => {
  const container = new Container();
  const submit = jest.fn().mockResolvedValue({ status: 'submitted' });

  container.bind(NotificationSubmitService).toConstantValue({ submit } as never);
  container.load(new KibanaContainerModule(bindContract));

  return { container, submit };
};

describe('bindContract', () => {
  it('exposes forType on the setup contract and forwards to the submit service', async () => {
    const { container, submit } = createContainer();
    const contract = getSetupContract(container);

    const pending = contract.forType(modelStatus).submit(content);
    start(container);

    await expect(pending).resolves.toEqual({ status: 'submitted' });
    expect(submit).toHaveBeenCalledWith(
      { namespace: 'inference', type: 'modelStatus', kind: modelStatus.kind },
      content
    );
  });

  // Producers capture `submit` during setup, but the write path needs start-stage services.
  it('defers resolving the submit service until the plugin has started', async () => {
    const { container, submit } = createContainer();
    const contract = getSetupContract(container);

    const pending = contract.forType(modelStatus).submit(content);
    await Promise.resolve();

    expect(submit).not.toHaveBeenCalled();

    start(container);
    await pending;

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('exposes an empty start contract', () => {
    const { container } = createContainer();

    expect(container.get(Start)).toEqual({});
  });
});
