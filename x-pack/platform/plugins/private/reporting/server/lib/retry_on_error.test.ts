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
    jest.resetAllMocks();
    jest.spyOn(global.Math, 'random').mockReturnValue(randomDelayMultiplier);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
  });

  it('logs a warning message on retry', async () => {
    const error = new Error('fail');
    const operationMock = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

    await retryOnError({ operation: operationMock, retries: 3, report, logger });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [2s] due to error: ${error.toString()} ${error.stack} - attempt 1 of 4 failed.`
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      `Report generation for report[290357209345723095] succeeded on attempt 2.`
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

    expect(await retryOnError({ operation: operationMock, retries: 3, report, logger })).toEqual(
      'success'
    );
    // initial attempt + 3 retries
    expect(operationMock).toHaveBeenCalledTimes(4);
    expect(logger.warn).toHaveBeenCalledTimes(3);
    expect(logger.warn.mock.calls[0][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [2s] due to error: ${error.toString()} ${error.stack} - attempt 1 of 4 failed.`
    );
    expect(logger.warn.mock.calls[1][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [4s] due to error: ${error.toString()} ${error.stack} - attempt 2 of 4 failed.`
    );
    expect(logger.warn.mock.calls[2][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [8s] due to error: ${error.toString()} ${error.stack} - attempt 3 of 4 failed.`
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      `Report generation for report[290357209345723095] succeeded on attempt 4.`
    );
  });

  it('throws error if number of retries exceeds max allowed', async () => {
    const error = new Error('fail');
    const operationMock = jest.fn().mockRejectedValue(error);

    await expect(
      retryOnError({ operation: operationMock, retries: 3, report, logger })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"fail"`);
    expect(logger.warn).toHaveBeenCalledTimes(3);

    // initial attempt + 3 retries
    expect(operationMock).toHaveBeenCalledTimes(4);

    expect(logger.warn.mock.calls[0][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [2s] due to error: ${error.toString()} ${error.stack} - attempt 1 of 4 failed.`
    );
    expect(logger.warn.mock.calls[1][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [4s] due to error: ${error.toString()} ${error.stack} - attempt 2 of 4 failed.`
    );
    expect(logger.warn.mock.calls[2][0]).toEqual(
      `Retrying report generation for report[${
        report._id
      }] after [8s] due to error: ${error.toString()} ${error.stack} - attempt 3 of 4 failed.`
    );

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      `No retries left for report generation for report[${
        report._id
      }]. No report generated after 4 attempts due to error: ${error.toString()} ${error.stack}`
    );
  });
});
