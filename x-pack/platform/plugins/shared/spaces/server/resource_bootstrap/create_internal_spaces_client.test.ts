/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import { coreMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { createInternalSpacesClient } from './create_internal_spaces_client';
import type { ConfigType } from '../config';
import { SpacesClient } from '../spaces_client';

jest.mock('../spaces_client');

describe('createInternalSpacesClient', () => {
  const config = { maxSpaces: 1000 } as ConfigType;
  const features = { name: 'features' };
  const repository = savedObjectsRepositoryMock.create();
  const logger = loggerMock.create();

  const build = () => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.savedObjects.createInternalRepository.mockReturnValue(repository);
    core.getStartServices.mockResolvedValue([coreStart, { features }, {}] as never);
    return {
      coreStart,
      getClient: createInternalSpacesClient({
        core: core as never,
        config$: of(config),
        buildFlavor: 'traditional',
        logger,
      }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads and writes the space type through the internal repository, with no user', async () => {
    const { coreStart, getClient } = build();

    await getClient();

    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledWith(['space']);
    expect(SpacesClient).toHaveBeenCalledWith(
      expect.any(Function),
      config,
      repository,
      [],
      'traditional',
      features,
      undefined
    );
  });

  it('logs at debug level', async () => {
    const { getClient } = build();
    await getClient();

    const [debug] = jest.mocked(SpacesClient).mock.calls[0];
    debug('hello');

    expect(logger.debug).toHaveBeenCalledWith('hello');
  });
});
