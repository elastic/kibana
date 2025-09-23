/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';

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
  deps: { rulesClient?: RulesClientApi },
  params: {
    alertTemplateArchiveAsset: ArchiveAsset;
    spaceId?: string;
    pkgName: string;
  }
): Promise<KibanaAssetReference> {
  const { rulesClient } = deps;
  const { pkgName, alertTemplateArchiveAsset, spaceId } = params;
  const ruleId = getRuleId({ pkgName, templateId: alertTemplateArchiveAsset.id, spaceId });
  const template = await rulesClient
    ?.getTemplate({ id: alertTemplateArchiveAsset.id })
    .catch((err) => {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        return undefined;
      }
      throw err;
    });
  if (!template) {
    return {
      id: ruleId,
      type: KibanaSavedObjectType.alert,
      deferred: true,
    };
  }

  const rule = await rulesClient?.get({ id: ruleId }).catch((err) => {
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
    };
  }

  const { ruleTypeId, ...rest } = template;

  await rulesClient?.create({
    data: {
      alertTypeId: ruleTypeId,
      ...rest,
      enabled: true,
      actions: [],
      consumer: 'alerts',
    }, // what value for consumer will make sense?
    options: { id: ruleId },
  });
  // Todo catch error

  return {
    id: ruleId,
    type: KibanaSavedObjectType.alert,
  };
}

export async function stepCreateAlertingRules(context: InstallContext) {
  const { logger, savedObjectsClient, packageInstallContext, spaceId } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;

  // TODO if feature flag or pkg !== elastic agent return

  await withPackageSpan('Install elastic agent rules', async () => {
    if (pkgName !== 'all_assets') {
      return;
    }

    if (!context.authorizationHeader) {
      // Need authorization to create a rule as it need an api key
      return;
    }

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
          { rulesClient },
          { alertTemplateArchiveAsset: alertTemplate, spaceId, pkgName }
        );
        assetRefs.push(ref);
      },
      (path) => path.match(/\/alerting_rule_template\//) !== null
    );

    await saveKibanaAssetsRefs(savedObjectsClient, pkgName, assetRefs, false, true);
  });
}
