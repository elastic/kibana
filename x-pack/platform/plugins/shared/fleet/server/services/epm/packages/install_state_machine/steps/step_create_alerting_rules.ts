/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

import { SavedObjectsErrorHelpers, type ElasticsearchClient } from '@kbn/core/server';

import pMap from 'p-map';

import { FLEET_ELASTIC_AGENT_PACKAGE, FleetError } from '../../../../../../common';
import { type KibanaAssetReference, KibanaSavedObjectType } from '../../../../../../common/types';
import { createKibanaRequestFromAuth } from '../../../../request_utils';
import { appContextService } from '../../../../app_context';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';
import type { ArchiveAsset } from '../../../kibana/assets/install';
import { saveKibanaAssetsRefs } from '../../install';
import { MAX_CONCURRENT_RULE_CREATION_OPERATIONS } from '../../../../../constants';

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
  deps: {
    rulesClient?: RulesClientApi;
    esClient: ElasticsearchClient;
    logger: InstallContext['logger'];
  },
  params: {
    alertTemplateArchiveAsset: ArchiveAsset;
    spaceId?: string;
    pkgName: string;
  }
): Promise<KibanaAssetReference> {
  const { rulesClient, esClient, logger } = deps;
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

    const { params: ruleParams } = rest;

    const esql = ruleParams?.esqlQuery?.esql;

    if (esql) {
      const validationResult = await validateEsqlQuery(esClient, esql);

      if (!validationResult.isValid) {
        logger.debug(
          `Rule: ${ruleId} failed validation for package ${pkgName}, installation will be deferred`
        );
        return {
          id: ruleId,
          type: KibanaSavedObjectType.alert,
          deferred: true,
        };
      }
    }

    logger.debug(`Creating rule: ${ruleId} for package ${pkgName}`);
    await rulesClient.create({
      data: {
        alertTypeId: ruleTypeId,
        ...rest,
        enabled: true,
        actions: [],
        consumer: 'alerts',
      },
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
  const { logger, savedObjectsClient, packageInstallContext, authorizationHeader, spaceId } =
    context;

  if (!authorizationHeader) {
    logger.debug('No authorization header provided, skipping alerting rule creation step');
    return;
  }

  // User scoped ES client is required to ensure the ESQL that is validated is authorized to the indexes used
  // An internal ES client will fail on non managed indexes.
  const userRequest = createKibanaRequestFromAuth(authorizationHeader);
  const userEsClient = appContextService.getUserScopedESClient(userRequest);

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

    const alertTemplateAssets: ArchiveAsset[] = [];
    await packageInstallContext.archiveIterator.traverseEntries(
      async (entry) => {
        if (!entry.buffer) {
          return;
        }

        const alertTemplate = JSON.parse(entry.buffer.toString('utf8')) as ArchiveAsset;
        alertTemplateAssets.push(alertTemplate);
      },
      (path) => path.match(/\/alerting_rule_template\//) !== null
    );

    const assetRefs: KibanaAssetReference[] = [];
    await pMap(
      alertTemplateAssets,
      async (alertTemplate) => {
        const ref = await createAlertingRuleFromTemplate(
          { rulesClient, esClient: userEsClient, logger },
          { alertTemplateArchiveAsset: alertTemplate, spaceId, pkgName }
        );

        assetRefs.push(ref);
      },
      { concurrency: MAX_CONCURRENT_RULE_CREATION_OPERATIONS }
    );

    await saveKibanaAssetsRefs(savedObjectsClient, pkgName, assetRefs, false, true);
  });
}

async function validateEsqlQuery(esClient: ElasticsearchClient, esql: string) {
  try {
    // We do an async request here since validation failures will fail the query quickly
    // If it is valid, we don't want to wait around for the results.
    await esClient.esql.asyncQuery({
      query: esql,
    });
    return { isValid: true };
  } catch (e) {
    return {
      isValid: false,
      error: e,
    };
  }
}
