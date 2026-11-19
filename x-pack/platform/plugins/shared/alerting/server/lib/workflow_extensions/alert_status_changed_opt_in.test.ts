/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { isAlertStatusChangedEnabled } from './alert_status_changed_opt_in';

describe('isAlertStatusChangedEnabled', () => {
  const setup = () => ({
    logger: loggingSystemMock.createLogger(),
    request: httpServerMock.createKibanaRequest(),
  });

  it('is false when nobody has opted in', async () => {
    const { logger, request } = setup();

    await expect(isAlertStatusChangedEnabled({ optIns: [], request, logger })).resolves.toBe(false);
  });

  it('is true when an opt-in is enabled, and passes it the request', async () => {
    const { logger, request } = setup();
    const isEnabled = jest.fn().mockResolvedValue(true);

    await expect(
      isAlertStatusChangedEnabled({ optIns: [{ isEnabled }], request, logger })
    ).resolves.toBe(true);
    expect(isEnabled).toHaveBeenCalledWith(request);
  });

  it('is false when every opt-in says no', async () => {
    const { logger, request } = setup();
    const optIns = [
      { isEnabled: jest.fn().mockResolvedValue(false) },
      { isEnabled: jest.fn().mockResolvedValue(false) },
    ];

    await expect(isAlertStatusChangedEnabled({ optIns, request, logger })).resolves.toBe(false);
    expect(optIns[0].isEnabled).toHaveBeenCalledTimes(1);
    expect(optIns[1].isEnabled).toHaveBeenCalledTimes(1);
  });

  it('stops at the first opt-in that is enabled', async () => {
    const { logger, request } = setup();
    const optIns = [
      { isEnabled: jest.fn().mockResolvedValue(true) },
      { isEnabled: jest.fn().mockResolvedValue(true) },
    ];

    await expect(isAlertStatusChangedEnabled({ optIns, request, logger })).resolves.toBe(true);
    expect(optIns[1].isEnabled).not.toHaveBeenCalled();
  });

  it('logs a check that throws, treats it as false, and still asks the others', async () => {
    const { logger, request } = setup();
    const optIns = [
      { isEnabled: jest.fn().mockRejectedValue(new Error('flag service unavailable')) },
      { isEnabled: jest.fn().mockResolvedValue(true) },
    ];

    await expect(isAlertStatusChangedEnabled({ optIns, request, logger })).resolves.toBe(true);

    const warnings = loggingSystemMock.collect(logger).warn;
    expect(warnings).toHaveLength(1);
    const [message, meta] = warnings[0];
    expect(message).toEqual(expect.stringContaining('flag service unavailable'));
    expect(meta).toEqual({
      error: { stack_trace: expect.stringContaining('flag service unavailable') },
    });
  });

  it('is false when every opt-in throws', async () => {
    const { logger, request } = setup();
    const optIns = [{ isEnabled: jest.fn().mockRejectedValue(new Error('boom')) }];

    await expect(isAlertStatusChangedEnabled({ optIns, request, logger })).resolves.toBe(false);
  });
});
