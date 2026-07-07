/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { retryOnError } from './retry_on_error';
import { SavedReport } from './store';
import { KibanaShuttingDownError } from '@kbn/reporting-common';

const logger = loggerMock.create();
const randomDelayMultiplier = 0.01;
const report = new SavedReport({
  _id: '290357209345723095',
  _index: '.reporting-fantastic',
  _seq_no: 23,
  _primary_term: 354000,
  jobtype: 'cool-report',
  payload: {
    headers: '',
    title: '',
    browserTimezone: '',
    objectType: '',
    version: '',
  },
});

describe('retryOnError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global.Math, 'random').mockReturnValue(randomDelayMultiplier);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  it(`doesn't retry if operation is successful`, async () => {
    const operationMock = jest.fn().mockResolvedValue('success');
    expect(await retryOnError({ operation: operationMock, retries: 3, report, logger })).toEqual(
      'success'
    );
    expect(operationMock).toHaveBeenCalledTimes(1);
    // does not log anything if first attempt is successful
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(setTimeout).not.toHaveBeenCalled();
  });

  it('logs an error message on retry', async () => {
    const error = new Error('fail');
    const operationMock = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

    const retryPromise = retryOnError({ operation: operationMock, retries: 3, report, logger });
    await Promise.resolve();

    jest.runAllTimers();
    await retryPromise;

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      2000 * (1 + randomDelayMultiplier)
    );
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [2s] due to error: ${error.toString()} - attempt 1 of 4 failed.`
    );
    expect(logger.info).toHaveBeenCalledWith(
      `Report generation for report[290357209345723095] succeeded on attempt 2.`,
      { tags: [report._id] }
    );
    // initial attempt + 1 retry
    expect(operationMock).toHaveBeenCalledTimes(2);
  });

  it('does not log if no retries are configured', async () => {
    const error = new Error('fail');
    const operationMock = jest.fn().mockRejectedValueOnce(error);

    await expect(
      retryOnError({ operation: operationMock, retries: 0, report, logger })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"fail"`);
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(setTimeout).not.toHaveBeenCalled();
    expect(operationMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry if error is KibanaShuttingDownError', async () => {
    const error = new KibanaShuttingDownError('shutdown');
    const operationMock = jest.fn().mockRejectedValueOnce(error);

    await expect(
      retryOnError({ operation: operationMock, retries: 3, report, logger })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"ReportingError(code: kibana_shutting_down_error) \\"shutdown\\""`
    );
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(setTimeout).not.toHaveBeenCalled();
    expect(operationMock).toHaveBeenCalledTimes(1);
  });

  it('retries with an exponential backoff', async () => {
    const error = new Error('fail');
    const operationMock = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const retryPromise = retryOnError({ operation: operationMock, retries: 3, report, logger });
    await Promise.resolve();

    jest.runAllTimersAsync().catch(() => {});
    expect(await retryPromise).toEqual('success');
    // initial attempt + 3 retries
    expect(setTimeout).toHaveBeenCalledTimes(3);
    expect(setTimeout).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      2000 * (1 + randomDelayMultiplier)
    );
    expect(setTimeout).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      4000 * (1 + randomDelayMultiplier)
    );
    expect(setTimeout).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      8000 * (1 + randomDelayMultiplier)
    );
    expect(operationMock).toHaveBeenCalledTimes(4);
    expect(logger.error).toHaveBeenCalledTimes(3);
    expect(logger.error.mock.calls[0][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [2s] due to error: ${error.toString()} - attempt 1 of 4 failed.`
    );
    expect(logger.error.mock.calls[1][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [4s] due to error: ${error.toString()} - attempt 2 of 4 failed.`
    );
    expect(logger.error.mock.calls[2][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [8s] due to error: ${error.toString()} - attempt 3 of 4 failed.`
    );
    expect(logger.info).toHaveBeenCalledWith(
      `Report generation for report[290357209345723095] succeeded on attempt 4.`,
      { tags: [report._id] }
    );
  });

  it('throws error if number of retries exceeds max allowed', async () => {
    const error = new Error('fail');
    const operationMock = jest.fn().mockRejectedValue(error);

    const retryPromise = retryOnError({ operation: operationMock, retries: 3, report, logger });
    await Promise.resolve();

    jest.runAllTimersAsync().catch(() => {});
    await expect(retryPromise).rejects.toThrowErrorMatchingInlineSnapshot(`"fail"`);

    // initial attempt + 3 retries
    expect(operationMock).toHaveBeenCalledTimes(4);
    expect(setTimeout).toHaveBeenCalledTimes(3);
    expect(setTimeout).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      2000 * (1 + randomDelayMultiplier)
    );
    expect(setTimeout).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      4000 * (1 + randomDelayMultiplier)
    );
    expect(setTimeout).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      8000 * (1 + randomDelayMultiplier)
    );
    expect(logger.error.mock.calls[0][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [2s] due to error: ${error.toString()} - attempt 1 of 4 failed.`
    );
    expect(logger.error.mock.calls[1][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [4s] due to error: ${error.toString()} - attempt 2 of 4 failed.`
    );
    expect(logger.error.mock.calls[2][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [8s] due to error: ${error.toString()} - attempt 3 of 4 failed.`
    );

    expect(logger.info).toHaveBeenCalledWith(
      `No retries left for report generation for report[${
        report._id
      }]. No report generated after 4 attempts due to error: ${error.toString()}`,
      { tags: [report._id] }
    );
  });
});
