/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createSpaceExists } from './space_exists';

describe('createSpaceExists', () => {
  const withLookup = (lookup?: jest.Mock) => {
    const logger = loggerMock.create();
    return { spaceExists: createSpaceExists(lookup, logger), logger };
  };

  it('asks the lookup the space kind gives', async () => {
    const lookup = jest.fn().mockResolvedValue(true);
    const { spaceExists } = withLookup(lookup);

    await expect(spaceExists('team-a')).resolves.toBe(true);
    expect(lookup).toHaveBeenCalledWith('team-a');
  });

  it('says a space the lookup does not find does not exist', async () => {
    const { spaceExists } = withLookup(jest.fn().mockResolvedValue(false));

    await expect(spaceExists('typo')).resolves.toBe(false);
  });

  it('cannot tell when the lookup fails', async () => {
    const { spaceExists } = withLookup(jest.fn().mockRejectedValue(new Error('boom')));

    await expect(spaceExists('team-a')).resolves.toBeUndefined();
  });

  it('does not look up the default space', async () => {
    const lookup = jest.fn();
    const { spaceExists } = withLookup(lookup);

    await expect(spaceExists('default')).resolves.toBe(true);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('knows only the default space without a lookup', async () => {
    const { spaceExists } = withLookup();

    await expect(spaceExists('team-a')).resolves.toBe(false);
    await expect(spaceExists('default')).resolves.toBe(true);
  });

  it('warns once that the spaces plugin is disabled, on the first lookup of another space', async () => {
    const { spaceExists, logger } = withLookup();

    await spaceExists('default');
    expect(logger.warn).not.toHaveBeenCalled();

    await spaceExists('team-a');
    await spaceExists('team-b');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('The spaces plugin is disabled')
    );
  });

  it('does not warn about the spaces plugin when a kind gives a lookup', async () => {
    const { spaceExists, logger } = withLookup(jest.fn().mockResolvedValue(true));

    await spaceExists('team-a');

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
