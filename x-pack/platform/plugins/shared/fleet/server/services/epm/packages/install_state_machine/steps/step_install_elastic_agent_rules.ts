/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '@kbn/fleet-plugin/server/services/app_context';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import { HTTPAuthorizationHeader } from '@kbn/security-plugin/server';
import { FakeRawRequest } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core/packages/http/server-utils';

function createKibanaRequestFromAuth(authorizationHeader: HTTPAuthorizationHeader) {
  const requestHeaders: Headers = {
    authorization: authorizationHeader.toString(),
  };
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  // Since we're using API keys and accessing elasticsearch can only be done
  // via a request, we're faking one with the proper authorization headers.
  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  return fakeRequest;
}

export async function stepInstallElasticAgentRules(context: InstallContext) {
  const { savedObjectsClient, logger, installedPkg, packageInstallContext, spaceId } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, title: pkgTitle } = packageInfo;

  await withPackageSpan('Install elastic agent rules', async () => {
    if (pkgName !== 'all_assets') {
      return;
    }

    if (!context.authorizationHeader) {
      // Need authorization to create a rule as it need an api key
      return;
    }

    const rulesClient = await appContextService
      .getAlertingStart()
      ?.getRulesClientWithRequest(createKibanaRequestFromAuth(context.authorizationHeader));

    if (!rulesClient) {
      throw new Error('Rules client is not available');
    }

    await packageInstallContext.archiveIterator.traverseEntries(
      async (entry) => {
        if (!entry.buffer) {
          return;
        }

        const alert = JSON.parse(entry.buffer.toString('utf8'));
        const { ruleTypeId, ...rest } = alert.attributes;

        await rulesClient.create({
          data: { alertTypeId: ruleTypeId, ...rest, enabled: true, consumer: 'alerts' }, // what value for consumer will make sense?
          options: { id: 'hardcoded-id' },
        });
      },
      (path) => path.match(/\/alerting_rule_template\//) !== null
    );
  });
}
