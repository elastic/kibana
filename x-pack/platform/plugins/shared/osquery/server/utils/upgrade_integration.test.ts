/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Installation } from '@kbn/fleet-plugin/common';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';
import { upgradeIntegration } from './upgrade_integration';
import { installPackage } from '@kbn/fleet-plugin/server/services/epm/packages';
import { pkgToPkgKey } from '@kbn/fleet-plugin/server/services/epm/registry';

jest.mock('@kbn/fleet-plugin/server/services/epm/packages', () => ({
  installPackage: jest.fn(),
}));

jest.mock('@kbn/fleet-plugin/server/services/epm/registry', () => ({
  pkgToPkgKey: jest.fn(),
}));

describe('upgradeIntegration', () => {
  const logger = loggingSystemMock.createLogger();
  const client = {} as unknown as Parameters<typeof upgradeIntegration>[0]['client'];
  const esClient = {} as unknown as Parameters<typeof upgradeIntegration>[0]['esClient'];

  beforeEach(() => {
    jest.clearAllMocks();
    (pkgToPkgKey as jest.Mock).mockReturnValue('osquery_manager-1.6.0');
  });

  it('does nothing when packageInfo is missing', async () => {
    await upgradeIntegration({ packageInfo: undefined, client, esClient, logger });

    expect(installPackage).not.toHaveBeenCalled();
  });

  it('does nothing when package version is >= 1.6.0', async () => {
    const packageInfo = {
      name: 'osquery_manager',
      version: '1.6.0',
      installed_kibana_space_id: DEFAULT_SPACE_ID,
    } as Installation;

    await upgradeIntegration({ packageInfo, client, esClient, logger });

    expect(installPackage).not.toHaveBeenCalled();
  });

  it('installs package when version is below 1.6.0', async () => {
    const packageInfo = {
      name: 'osquery_manager',
      version: '1.5.0',
      installed_kibana_space_id: DEFAULT_SPACE_ID,
    } as Installation;

    await upgradeIntegration({ packageInfo, client, esClient, logger });

    expect(pkgToPkgKey).toHaveBeenCalledWith({ name: 'osquery_manager', version: '1.6.0' });
    expect(installPackage).toHaveBeenCalledWith({
      installSource: 'registry',
      savedObjectsClient: client,
      pkgkey: 'osquery_manager-1.6.0',
      esClient,
      spaceId: DEFAULT_SPACE_ID,
      force: true,
    });
  });
});
