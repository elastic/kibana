/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { NotificationsCenterPlugin } from './plugin';

describe('NotificationsCenterPlugin (public)', () => {
  it('does not register an application (nothing user-visible)', () => {
    const plugin = new NotificationsCenterPlugin();
    const coreSetup = coreMock.createSetup();

    expect(() => plugin.setup(coreSetup)).not.toThrow();
    expect(coreSetup.application.register).not.toHaveBeenCalled();
  });
});
