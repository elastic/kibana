/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';

import type { PackagePolicy } from '../../types';
import { packagePolicyService } from '../../services';
import { appContextService } from '../../services/app_context';
import { runWithCache } from '../../services/epm/packages/cache';

import { _runRemediateInvalidDatasets } from './run_remediate_invalid_datasets';

jest.mock('../../services/package_policy');
jest.mock('../../services/app_context');
jest.mock('../../services/epm/packages/cache', () => ({
  runWithCache: jest.fn((cb: () => Promise<unknown>) => cb()),
}));

const makePolicy = (
  id: string,
  datasetVarValue: string | undefined,
  overrides: Record<string, unknown> = {}
) => ({
  id,
  name: `Policy ${id}`,
  enabled: true,
  policy_ids: ['agent-policy-1'],
  namespace: 'default',
  package: { name: 'aws_logs', title: 'AWS Logs', version: '1.0.0' },
  revision: 1,
  is_managed: false,
  spaceIds: ['default'],
  inputs: [
    {
      type: 'aws-s3',
      enabled: true,
      policy_template: 'aws',
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'aws_logs.s3access' },
          vars: datasetVarValue
            ? {
                'data_stream.dataset': { type: 'text', value: datasetVarValue },
              }
            : {},
        },
      ],
    },
  ],
  ...overrides,
});

const makeAsyncIterable = (
  batches: Array<Array<ReturnType<typeof makePolicy>>>
): AsyncIterable<PackagePolicy[]> => {
  return (async function* (): AsyncGenerator<PackagePolicy[], void, unknown> {
    for (const batch of batches) {
      yield batch as unknown as PackagePolicy[];
    }
  })();
};

describe('_runRemediateInvalidDatasets', () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  const logger = loggingSystemMock.createLogger();
  const signal = new AbortController().signal;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(runWithCache).mockImplementation((cb) => cb());
    jest.mocked(appContextService.getInternalUserSOClientForSpaceId).mockReturnValue(soClient);
  });

  it('produces no findings when all dataset values are valid', async () => {
    jest
      .mocked(packagePolicyService.fetchAllItems)
      .mockResolvedValueOnce(
        makeAsyncIterable([
          [makePolicy('p1', 'aws_logs.s3access'), makePolicy('p2', 'valid_dataset')],
        ])
      );
    jest.mocked(packagePolicyService.update).mockResolvedValue({} as any);

    const report = await _runRemediateInvalidDatasets({
      soClient,
      esClient,
      signal,
      logger,
      mode: 'report',
    });

    expect(report.found).toBe(0);
    expect(report.updated).toBe(0);
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('reports findings without updating policies in report mode', async () => {
    jest
      .mocked(packagePolicyService.fetchAllItems)
      .mockResolvedValueOnce(makeAsyncIterable([[makePolicy('p1', 'my-invalid-dataset')]]));
    jest.mocked(packagePolicyService.update).mockResolvedValue({} as any);

    const report = await _runRemediateInvalidDatasets({
      soClient,
      esClient,
      signal,
      logger,
      mode: 'report',
    });

    expect(report.found).toBe(1);
    expect(report.updated).toBe(0);
    expect(report.findings[0].oldValue).toBe('my-invalid-dataset');
    expect(report.findings[0].newValue).toBe('my_invalid_dataset');
    expect(report.findings[0].outcome).toBe('would_update');
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('applies fixes and passes allowDatasetChange:true in apply mode', async () => {
    const policy = makePolicy('p1', 'my-invalid-dataset');
    jest
      .mocked(packagePolicyService.fetchAllItems)
      .mockResolvedValueOnce(makeAsyncIterable([[policy]]));
    jest.mocked(packagePolicyService.getByIDs).mockResolvedValueOnce([policy as any]);
    jest.mocked(packagePolicyService.update).mockResolvedValue({ ...policy } as any);

    const report = await _runRemediateInvalidDatasets({
      soClient,
      esClient,
      signal,
      logger,
      mode: 'apply',
    });

    expect(report.updated).toBe(1);
    expect(report.findings[0].outcome).toBe('updated');
    expect(packagePolicyService.update).toHaveBeenCalledWith(
      expect.anything(),
      esClient,
      'p1',
      expect.objectContaining({
        inputs: expect.arrayContaining([
          expect.objectContaining({
            streams: expect.arrayContaining([
              expect.objectContaining({
                vars: expect.objectContaining({
                  'data_stream.dataset': expect.objectContaining({ value: 'my_invalid_dataset' }),
                }),
              }),
            ]),
          }),
        ]),
      }),
      expect.objectContaining({ allowDatasetChange: true, force: true })
    );
  });

  it('skips policies whose invalid datasets sanitize to the same value (collision:sanitized)', async () => {
    // 'x-y' → x_y and 'x y' → x_y: both sanitize to the same value, so both must be skipped
    const p1 = makePolicy('p1', 'x-y');
    const p2 = makePolicy('p2', 'x y');

    jest
      .mocked(packagePolicyService.fetchAllItems)
      .mockResolvedValueOnce(makeAsyncIterable([[p1, p2]]));
    jest.mocked(packagePolicyService.update).mockResolvedValue({} as any);

    const report = await _runRemediateInvalidDatasets({
      soClient,
      esClient,
      signal,
      logger,
      mode: 'apply',
    });

    expect(report.skippedCollision).toBe(2);
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('skips managed policies', async () => {
    const managedPolicy = makePolicy('p1', 'my-invalid-dataset', { is_managed: true });
    jest
      .mocked(packagePolicyService.fetchAllItems)
      .mockResolvedValueOnce(makeAsyncIterable([[managedPolicy]]));
    jest.mocked(packagePolicyService.update).mockResolvedValue({} as any);

    const report = await _runRemediateInvalidDatasets({
      soClient,
      esClient,
      signal,
      logger,
      mode: 'apply',
    });

    expect(report.skippedManaged).toBe(1);
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('marks unfixable findings when sanitizeDataset returns undefined', async () => {
    // A dataset that consists entirely of invalid chars → sanitizes to undefined
    const unfixable = makePolicy('p1', '---');
    jest
      .mocked(packagePolicyService.fetchAllItems)
      .mockResolvedValueOnce(makeAsyncIterable([[unfixable]]));
    jest.mocked(packagePolicyService.update).mockResolvedValue({} as any);

    const report = await _runRemediateInvalidDatasets({
      soClient,
      esClient,
      signal,
      logger,
      mode: 'apply',
    });

    expect(report.unfixable).toBe(1);
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });

  it('records a failed update without aborting the run', async () => {
    const p1 = makePolicy('p1', 'bad-dataset');
    const p2 = makePolicy('p2', 'another-bad');
    jest
      .mocked(packagePolicyService.fetchAllItems)
      .mockResolvedValueOnce(makeAsyncIterable([[p1, p2]]));
    jest.mocked(packagePolicyService.getByIDs).mockResolvedValueOnce([p1 as any, p2 as any]);
    jest
      .mocked(packagePolicyService.update)
      .mockRejectedValueOnce(new Error('SO write failed'))
      .mockResolvedValueOnce({ ...p2 } as any);

    const report = await _runRemediateInvalidDatasets({
      soClient,
      esClient,
      signal,
      logger,
      mode: 'apply',
    });

    expect(report.failed).toBe(1);
    expect(report.updated).toBe(1);
  });

  it('propagates abort signal', async () => {
    const controller = new AbortController();
    jest.mocked(packagePolicyService.fetchAllItems).mockResolvedValueOnce(
      (async function* (): AsyncGenerator<PackagePolicy[], void, unknown> {
        controller.abort();
        yield [makePolicy('p1', 'bad-dataset')] as unknown as PackagePolicy[];
      })()
    );

    await expect(
      _runRemediateInvalidDatasets({
        soClient,
        esClient,
        signal: controller.signal,
        logger,
        mode: 'report',
      })
    ).rejects.toThrow();
  });

  it('skips a dataset already used by another valid policy (collision:existing)', async () => {
    // p1 has invalid dataset 'bad-value', p2 has valid dataset 'bad_value' (the sanitized form)
    const p1 = makePolicy('p1', 'bad-value');
    // Make p2 have the exact same type+dataset as what p1 would sanitize to
    const p2 = {
      ...makePolicy('p2', undefined),
      inputs: [
        {
          type: 'aws-s3',
          enabled: true,
          policy_template: 'aws',
          streams: [
            {
              enabled: true,
              data_stream: { type: 'logs', dataset: 'aws_logs.s3access' },
              vars: {
                'data_stream.dataset': { type: 'text', value: 'bad_value' },
              },
            },
          ],
        },
      ],
    };

    jest
      .mocked(packagePolicyService.fetchAllItems)
      .mockResolvedValueOnce(makeAsyncIterable([[p1, p2]]));
    jest.mocked(packagePolicyService.update).mockResolvedValue({} as any);

    const report = await _runRemediateInvalidDatasets({
      soClient,
      esClient,
      signal,
      logger,
      mode: 'apply',
    });

    // p1 should be skipped because 'bad_value' is already used by p2
    expect(report.skippedCollision).toBe(1);
    expect(packagePolicyService.update).not.toHaveBeenCalled();
  });
});
