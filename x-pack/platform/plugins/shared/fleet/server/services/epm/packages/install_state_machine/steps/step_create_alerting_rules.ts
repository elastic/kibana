/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { FLEET_ELASTIC_AGENT_PACKAGE, FleetError } from '../../../../../../common';
import { type KibanaAssetReference, KibanaSavedObjectType } from '../../../../../../common/types';
import { createKibanaRequestFromAuth } from '../../../../request_utils';
import { appContextService } from '../../../../app_context';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import type { ArchiveAsset } from '../../../kibana/assets/install';
import { saveKibanaAssetsRefs } from '../../install';

function getRuleId({
  pkgName,
  templateId,
  spaceId,
}: {
  pkgName: string;
  templateId: string;
  spaceId?: string;
}) {
  return `fleet-${spaceId ? spaceId : DEFAULT_SPACE_ID}-${pkgName}-${templateId}`;
}

export async function createAlertingRuleFromTemplate(
  deps: { rulesClient?: RulesClientApi; logger: InstallContext['logger'] },
  params: {
    alertTemplateArchiveAsset: ArchiveAsset;
    spaceId?: string;
    pkgName: string;
  }
): Promise<KibanaAssetReference> {
  const { rulesClient, logger } = deps;
  const { pkgName, alertTemplateArchiveAsset, spaceId } = params;
  const ruleId = getRuleId({ pkgName, templateId: alertTemplateArchiveAsset.id, spaceId });
  try {
    if (!rulesClient) {
      throw new FleetError('Rules client is not available');
    }

    const template = await rulesClient
      .getTemplate({ id: alertTemplateArchiveAsset.id })
      .catch((err) => {
        if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
          return undefined;
        }
        throw err;
      });
    if (!template) {
      throw new FleetError(`Rule template ${alertTemplateArchiveAsset.id} not found`);
    }

    const rule = await rulesClient.get({ id: ruleId }).catch((err) => {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    });
    // Already created
    if (rule) {
      return {
        id: ruleId,
        type: KibanaSavedObjectType.alert,
        deferred: false,
      };
    }

    const { ruleTypeId, id: _id, ...rest } = template;

    logger.debug(`Creating rule: ${ruleId} for package ${pkgName}`);
    await rulesClient.create({
      data: {
        alertTypeId: ruleTypeId,
        ...rest,
        enabled: true,
        actions: [],
        consumer: 'alerts',
      }, // what value for consumer will make sense?
      options: { id: ruleId },
    });

    return {
      id: ruleId,
      type: KibanaSavedObjectType.alert,
      deferred: false,
    };
  } catch (e) {
    logger.error(`Error creating rule: ${ruleId} for package ${pkgName}`, { error: e });

    return {
      id: ruleId,
      type: KibanaSavedObjectType.alert,
      deferred: true,
    };
  }
}

export async function stepCreateAlertingRules(
  context: Pick<
    InstallContext,
    'logger' | 'savedObjectsClient' | 'packageInstallContext' | 'spaceId' | 'authorizationHeader'
  >
) {
  const { logger, savedObjectsClient, packageInstallContext, spaceId } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;

  if (pkgName !== FLEET_ELASTIC_AGENT_PACKAGE) {
    return;
  }

  await withPackageSpan('Install elastic agent rules', async () => {
    const rulesClient = context.authorizationHeader
      ? await appContextService
          .getAlertingStart()
          ?.getRulesClientWithRequest(createKibanaRequestFromAuth(context.authorizationHeader))
      : undefined;

    const assetRefs: KibanaAssetReference[] = [];
    await packageInstallContext.archiveIterator.traverseEntries(
      async (entry) => {
        if (!entry.buffer) {
          return;
        }

        const alertTemplate = JSON.parse(entry.buffer.toString('utf8')) as ArchiveAsset;

        const ref = await createAlertingRuleFromTemplate(
          { rulesClient, logger },
          { alertTemplateArchiveAsset: alertTemplate, spaceId, pkgName }
        );
        assetRefs.push(ref);
      },
      (path) => path.match(/\/alerting_rule_template\//) !== null
    );
    await saveKibanaAssetsRefs(savedObjectsClient, pkgName, assetRefs, false, true);
  });
}
