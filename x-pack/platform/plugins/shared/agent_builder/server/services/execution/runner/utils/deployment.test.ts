/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { DeploymentInfo } from '../../../../utils/deployment_info';
import { resolveDeploymentContext } from './deployment';

const statefulInfo: DeploymentInfo = { environment: 'ech', version: '9.3.0', airgapped: false };
const serverlessInfo: DeploymentInfo = {
  environment: 'serverless',
  airgapped: false,
  serverless: { projectType: 'security', productTier: 'complete' },
};

describe('resolveDeploymentContext', () => {
  const setup = () => {
    const spaces = spacesMock.createStart();
    const licensing = licensingMock.createStart();
    spaces.spacesService.getActiveSpace.mockResolvedValue({
      id: DEFAULT_SPACE_ID,
      name: 'Default',
      disabledFeatures: [],
      solution: 'oblt',
    });
    licensing.getLicense.mockResolvedValue(
      licensingMock.createLicense({ license: { type: 'platinum', status: 'active' } })
    );
    return {
      spaces,
      licensing,
      request: httpServerMock.createKibanaRequest(),
      logger: loggerMock.create(),
    };
  };

  it('adds the space solution and license on stateful deployments', async () => {
    const deps = setup();

    expect(await resolveDeploymentContext({ deploymentInfo: statefulInfo, ...deps })).toEqual({
      ...statefulInfo,
      solution: 'oblt',
      license: { type: 'platinum', status: 'active' },
    });
    expect(deps.spaces.spacesService.getActiveSpace).toHaveBeenCalledWith(deps.request);
  });

  it('returns the static info without lookups on serverless', async () => {
    const deps = setup();

    expect(await resolveDeploymentContext({ deploymentInfo: serverlessInfo, ...deps })).toEqual(
      serverlessInfo
    );
    expect(deps.spaces.spacesService.getActiveSpace).not.toHaveBeenCalled();
    expect(deps.licensing.getLicense).not.toHaveBeenCalled();
  });

  it('omits the solution and license when the lookups fail', async () => {
    const deps = setup();
    deps.spaces.spacesService.getActiveSpace.mockRejectedValue(new Error('forbidden'));
    deps.licensing.getLicense.mockRejectedValue(new Error('unavailable'));

    expect(await resolveDeploymentContext({ deploymentInfo: statefulInfo, ...deps })).toEqual(
      statefulInfo
    );
    expect(deps.logger.debug).toHaveBeenCalledTimes(2);
  });

  it('omits the license when it is not available', async () => {
    const deps = setup();
    deps.licensing.getLicense.mockResolvedValue({
      ...licensingMock.createLicenseMock(),
      isAvailable: false,
    });

    const deployment = await resolveDeploymentContext({ deploymentInfo: statefulInfo, ...deps });

    expect(deployment).not.toHaveProperty('license');
    expect(deployment.solution).toBe('oblt');
  });

  it('omits the solution when the spaces plugin is not available', async () => {
    const deps = setup();

    const deployment = await resolveDeploymentContext({
      deploymentInfo: statefulInfo,
      ...deps,
      spaces: undefined,
    });

    expect(deployment).not.toHaveProperty('solution');
    expect(deployment.license).toEqual({ type: 'platinum', status: 'active' });
  });
});
