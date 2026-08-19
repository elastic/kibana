/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { datasetClaimsHandler } from './dataset_claims_handler';

const setup = (body: Record<string, unknown>) => {
  const soClient = savedObjectsClientMock.create();
  const context = { core: Promise.resolve({ savedObjects: { client: soClient } }) } as never;
  const request = httpServerMock.createKibanaRequest({ body });
  const response = httpServerMock.createResponseFactory();
  return { soClient, context, request, response };
};

const notFound = () => SavedObjectsErrorHelpers.createGenericNotFoundError('t', 'x');
const validBody = { baseName: 'logs-payroll.records', packageName: 'new' };

describe('datasetClaimsHandler', () => {
  it('creates an active adoption claim for an unclaimed dataset', async () => {
    const { soClient, context, request, response } = setup(validBody);
    soClient.get.mockRejectedValue(notFound());
    soClient.create.mockResolvedValue({ id: 'logs-payroll.records' } as never);

    await datasetClaimsHandler(context, request, response);

    expect(soClient.create).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      expect.objectContaining({
        package_name: 'new',
        origin: 'adoption',
        status: 'active',
        index_patterns: ['logs-payroll.records-*'],
      }),
      expect.objectContaining({ id: 'logs-payroll.records', overwrite: false })
    );
    expect(response.ok).toHaveBeenCalled();
  });

  it('uses the prefix pattern when told the dataset is a prefix', async () => {
    const { soClient, context, request, response } = setup({
      ...validBody,
      baseName: 'logs-foo',
      datasetIsPrefix: true,
    });
    soClient.get.mockRejectedValue(notFound());
    soClient.create.mockResolvedValue({ id: 'logs-foo' } as never);

    await datasetClaimsHandler(context, request, response);

    expect(soClient.create).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      expect.objectContaining({ index_patterns: ['logs-foo.*-*'] }),
      expect.anything()
    );
  });

  it('refuses to transfer a claim held by another package', async () => {
    const { soClient, context, request, response } = setup(validBody);
    soClient.get.mockResolvedValue({
      attributes: { package_name: 'old', status: 'active' },
    } as never);

    await datasetClaimsHandler(context, request, response);

    expect(soClient.create).not.toHaveBeenCalled();
    expect(soClient.update).not.toHaveBeenCalled();
    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
  });

  it('is idempotent when the same package already holds an adoption claim', async () => {
    const { soClient, context, request, response } = setup(validBody);
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'new',
        status: 'active',
        origin: 'adoption',
        index_patterns: ['logs-payroll.records-*'],
      },
    } as never);

    await datasetClaimsHandler(context, request, response);

    expect(soClient.create).not.toHaveBeenCalled();
    expect(soClient.update).not.toHaveBeenCalled();
    expect(response.ok).toHaveBeenCalled();
  });

  it('promotes an existing install claim held by the same package to adoption', async () => {
    const { soClient, context, request, response } = setup(validBody);
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'new',
        status: 'active',
        origin: 'install',
        index_patterns: ['logs-payroll.records-*'],
      },
    } as never);

    await datasetClaimsHandler(context, request, response);

    expect(soClient.update).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      'logs-payroll.records',
      expect.objectContaining({ origin: 'adoption', status: 'active' })
    );
  });

  it('does not overwrite stored index patterns when promoting an existing claim', async () => {
    const { soClient, context, request, response } = setup(validBody);
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'new',
        status: 'active',
        origin: 'install',
        index_patterns: ['logs-payroll.records-*', 'logs-payroll.records-extra-*'],
      },
    } as never);

    await datasetClaimsHandler(context, request, response);

    expect(soClient.update.mock.calls[0][2]).not.toHaveProperty('index_patterns');
  });

  it('activates a pending claim it promotes, so it can authorize takeover', async () => {
    const { soClient, context, request, response } = setup(validBody);
    soClient.get.mockResolvedValue({
      attributes: {
        package_name: 'new',
        status: 'pending',
        origin: 'adoption',
        index_patterns: ['logs-payroll.records-*'],
      },
    } as never);

    await datasetClaimsHandler(context, request, response);

    expect(soClient.update).toHaveBeenCalledWith(
      'fleet-dataset-claims',
      'logs-payroll.records',
      expect.objectContaining({ status: 'active' })
    );
  });

  it('rejects a base name that is not a generated dataset name', async () => {
    const { context, request, response } = setup({ ...validBody, baseName: 'payroll' });

    await datasetClaimsHandler(context, request, response);

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
