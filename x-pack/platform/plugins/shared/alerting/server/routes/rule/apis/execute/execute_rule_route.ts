/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteOptions } from '../../..';
import { createBodySchemaV1 } from '../../../../../common/routes/rule/apis/create';
import { BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { verifyAccessAndContext } from '../../../lib';

export const executeRuleRoute = ({ router, licenseState, core }: RouteOptions) => {
  router.post(
    {
      path: `${BASE_ALERTING_API_PATH}/rule/_execute`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: `Executes a rule on-demand`,
        tags: ['oas-tag:alerting'],
      },
      validate: {
        request: {
          body: createBodySchemaV1,
        },
        response: {
          200: {
            body: () => schema.object({}, { unknowns: 'allow' }),
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const requestParams = req.body;
          const coreContext = await context.core;
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();
          const ruleType = alertingContext.getType(requestParams.rule_type_id);
          const [, { data, dataViews, share }] = await core.getStartServices();
          const savedObjectsClient = coreContext.savedObjects.client;
          const dataViewsService = await dataViews.dataViewsServiceFactory(
            savedObjectsClient,
            coreContext.elasticsearch.client.asInternalUser
          );
          const searchSourceClient = await data.search.searchSource.asScoped(req);
          const uiSettingsClient = coreContext.uiSettings.client;

          if (!ruleType) {
            return res.badRequest({
              body: `Rule type '${requestParams.rule_type_id}' is not registered.`,
            });
          }

          const esQueries = await rulesClient.preview({
            requestParams: req.body,
            ruleType,
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            savedObjectsClient,
            dataViewsService,
            searchSourceClient,
            getSpaceId: rulesClient.getSpaceId,
            share,
            uiSettingsClient,
          });

          return res.ok({ body: { _inspect: { esQueries } } });

          // const coreContext = await context.core;
          // const [, { data, dataViews, share }] = await core.getStartServices();
          // const alertingContext = await context.alerting;
          // const rulesClient = await alertingContext.getRulesClient();
          // const requestParams = req.body;
          // const ruleType = alertingContext.getType(requestParams.rule_type_id);
          //
          // if (!ruleType) {
          //   return res.badRequest({
          //     body: `Rule type '${requestParams.rule_type_id}' is not registered.`,
          //   });
          // }
          //
          // const esQueries: any[] = [];
          // const asCurrentUserWithMeta = createEsClientWithMeta(
          //   coreContext.elasticsearch.client.asCurrentUser,
          //   esQueries
          // );
          //
          // const savedObjectsClient = coreContext.savedObjects.client;
          // const dataViewsService = await dataViews.dataViewsServiceFactory(
          //   savedObjectsClient,
          //   coreContext.elasticsearch.client.asInternalUser
          // );
          // const searchSourceClient = await data.search.searchSource.asScoped(req);
          //
          // const services: RuleExecutorServices = {
          //   alertsClient: {
          //     isTrackedAlert: () => false,
          //     getAlertLimitValue: () => 1000,
          //     setAlertLimitReached: () => {},
          //     getRecoveredAlerts: () => [],
          //     report: () => {},
          //   },
          //   getDataViews: async () => dataViewsService,
          //   getMaintenanceWindowIds: async () => [],
          //   getSearchSourceClient: async () => searchSourceClient,
          //   savedObjectsClient: coreContext.savedObjects.client,
          //   scopedClusterClient: {
          //     asCurrentUser: asCurrentUserWithMeta,
          //   },
          //   share,
          //   shouldStopExecution: () => false,
          //   shouldWriteAlerts: () => false,
          //   uiSettingsClient: coreContext.uiSettings.client,
          //   getAsyncSearchClient: <T extends AsyncSearchParams>(
          //     strategy: AsyncSearchStrategies
          //   ) => {
          //     throw new Error('Not implemented');
          //   },
          // };
          //
          // const rule = {
          //   id: uuidv4(),
          //   ...requestParams,
          //   actions: requestParams.actions || [],
          //   schedule: requestParams.schedule || { interval: '1m' },
          //   enabled: requestParams.enabled === undefined ? true : requestParams.enabled,
          //   name: requestParams.name || 'On-demand execution',
          //   tags: requestParams.tags || [],
          //   throttle: requestParams.throttle || null,
          //   createdBy: 'elastic',
          //   updatedBy: 'elastic',
          //   createdAt: new Date(),
          //   updatedAt: new Date(),
          //   apiKeyOwner: 'elastic',
          //   notifyWhen: 'onActionGroup',
          //   consumer: requestParams.consumer,
          //   rule_type_id: requestParams.rule_type_id,
          //   params: requestParams.params,
          // };
          //
          // const options: RuleExecutorOptions = {
          //   executionId: uuidv4(),
          //   logger: context.logger,
          //   params: requestParams.params,
          //   previousStartedAt: null,
          //   rule,
          //   services,
          //   spaceId: rulesClient.getSpaceId(),
          //   startedAt: new Date(),
          //   startedAtOverridden: false,
          //   state: {},
          //   namespace: rulesClient.getSpaceId(),
          //   flappingSettings: DISABLE_FLAPPING_SETTINGS,
          //   getTimeRange: () => ({ from: 'now-5m', to: 'now' }),
          //   isServerless: false,
          // };
          //
          // await ruleType.executor(options);
          //
          // return res.ok({ body: { _inspect: { esQueries } } });
        } catch (error) {
          console.error(error);
        }
      })
    )
  );
};
