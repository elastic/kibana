/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetupContract as ActionsPluginSetupContract,
  ActionsClient,
} from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  CoreSetup,
  IUiSettingsClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core/server';
import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ServerlessProjectType } from '../../common/constants/types';
import type { CasesClient } from '../client';
import { LicensingService } from '../services/licensing';
import { getCasesConnectorAdapter, getCasesConnectorType } from './cases';

export type * from './types';
export { casesConnectors } from './factory';

export function registerConnectorTypes({
  alerting,
  actions,
  core,
  logger,
  getCasesClient,
  getActionsClient,
  getSpaceId,
  serverlessProjectType,
  isCasesAttachmentsEnabled,
  isTemplatesEnabled,
}: {
  actions: ActionsPluginSetupContract;
  alerting: AlertingServerSetup;
  core: CoreSetup;
  logger: Logger;
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
  getActionsClient: (request: KibanaRequest) => Promise<PublicMethodsOf<ActionsClient>>;
  getSpaceId: (request?: KibanaRequest) => string;
  serverlessProjectType?: ServerlessProjectType;
  isCasesAttachmentsEnabled: boolean;
  isTemplatesEnabled: boolean;
}) {
  const getUnsecuredSavedObjectsClient = async (
    request: KibanaRequest,
    savedObjectTypes: string[]
  ): Promise<SavedObjectsClientContract> => {
    const [coreStart] = await core.getStartServices();

    /**
     * The actions framework ensures that the user executing the case action
     * will have permissions to use cases for the corresponding owner and space.
     * The required Kibana privileges needed to execute the case action are defined
     * in x-pack/platform/plugins/shared/cases/server/connectors/cases/index.ts.
     *
     * We can safely disable security checks performed by the saved object client
     * as we implement our custom authorization.
     */
    const unsecuredSavedObjectsClient = coreStart.savedObjects.getScopedClient(request, {
      includedHiddenTypes: savedObjectTypes,
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });

    return unsecuredSavedObjectsClient;
  };

  const getUiSettingsClient = async (request: KibanaRequest): Promise<IUiSettingsClient> => {
    const [coreStart] = await core.getStartServices();
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

    return coreStart.uiSettings.asScopedToClient(savedObjectsClient);
  };

  const isAtLeastPlatinum = async (): Promise<boolean> => {
    const [, pluginsStart] = await core.getStartServices();
    const { licensing } = pluginsStart as { licensing: LicensingPluginStart };
    return new LicensingService(
      licensing.license$,
      licensing.featureUsage.notifyUsage
    ).isAtLeastPlatinum();
  };

  actions.registerSubActionConnectorType(
    getCasesConnectorType({
      getCasesClient,
      getActionsClient,
      getSpaceId,
      getUnsecuredSavedObjectsClient,
      getUiSettingsClient,
      serverlessProjectType,
      isCasesAttachmentsEnabled,
      isTemplatesEnabled,
      isAtLeastPlatinum,
    })
  );

  alerting.registerConnectorAdapter(getCasesConnectorAdapter({ serverlessProjectType, logger }));
}
