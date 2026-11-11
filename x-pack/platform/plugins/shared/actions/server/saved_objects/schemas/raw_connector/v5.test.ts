/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawConnectorSchema } from './v5';

const action = {
  actionTypeId: '.test',
  name: 'Test connector',
  isMissingSecrets: false,
  config: {},
  secrets: '{}',
};

describe('Raw Connector Schema v5', () => {
  it('keeps an unpinned connector unpinned', () => {
    expect(rawConnectorSchema.validate(action)).toEqual(action);
  });

  it('retains a pin when reading a connector from a later release', () => {
    const pinned = { ...action, specVersion: '1.0.0' };
    expect(rawConnectorSchema.validate(pinned)).toEqual(pinned);
    expect(
      rawConnectorSchema.extends({}, { unknowns: 'ignore' }).validate({
        ...pinned,
        futureAttribute: true,
      })
    ).toEqual(pinned);
  });

  it.each([null, 1, {}])('rejects an invalid pin: %p', (specVersion) => {
    expect(() => rawConnectorSchema.validate({ ...action, specVersion })).toThrow();
  });
});
