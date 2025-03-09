/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';
import { flatMap, get, trim, truncate } from 'lodash';
import { Logger, SavedObject } from '@kbn/core/server';
import { SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import {
  ALERT_ACTION_GROUP,
  ALERT_FLAPPING,
  ALERT_INSTANCE_ID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_UUID,
  getRuleDetailsRoute,
  triggersActionsRoute,
} from '@kbn/rule-data-utils';
import { Alert } from '@kbn/alerts-as-data-utils';
import { RuleAction } from '@kbn/alerting-types';
import { getIndexTemplateAndPattern } from '../../../../alerts_service/resource_installer_utils';
import { AdHocRunSO } from '../../../../data/ad_hoc_run/types';
import { calculateSchedule } from '../../../../backfill_client/lib';
import { adHocRunStatus } from '../../../../../common/constants';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { apiKeyAsRuleDomainProperties } from '../../../../rules_client/common';
import { NormalizedAlertAction, RulesClientContext } from '../../../../rules_client/types';
import { RuleParams } from '../../types';
import type { PreviewRuleData } from './types';
import { EVENT_LOG_ACTIONS } from '../../../../plugin';
import { PREVIEW_CONTEXT } from '../../../../alerts_service/alerts_service';
import {
  transformActionParams,
  transformSummaryActionParams,
} from '../../../../task_runner/transform_action_params';

export interface PreviewRuleParams<Params extends RuleParams = never> {
  data: PreviewRuleData<Params>;
}

export interface PreviewResults {
  uuid: string;
  alerts: Array<SearchHit<Alert>>;
  actions: any[];
}

export async function previewRule<Params extends RuleParams = never>(
  context: RulesClientContext,
  previewParams: PreviewRuleParams<Params>
  // TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
): Promise<PreviewResults> {
  const executionUuid = uuidv4();
  try {
    const temporaryRuleId = `preview-${uuidv4()}`;
    const { data } = previewParams;

    // authorization stuff here

    context.ruleTypeRegistry.ensureRuleTypeEnabled(data.alertTypeId);

    // throw error if rule type is not registered
    const ruleType = context.ruleTypeRegistry.get(data.alertTypeId);
    const ruleTypeActionGroups = new Map(
      ruleType.actionGroups.map((actionGroup) => [actionGroup.id, actionGroup.name])
    );

    const username = await context.getUserName();

    // create an API key for the enable and invalidate at the end
    let createdAPIKey = null;
    try {
      const name = truncate(`AlertingPreview: ${ruleType.id}/${trim(data.name)}`, { length: 256 });
      createdAPIKey = await context.createAPIKey(name);
    } catch (error) {
      throw Boom.badRequest(`Error previewing rule: could not create API key - ${error.message}`);
    }

    // create an ad hoc run SO
    const apiKey = apiKeyAsRuleDomainProperties(createdAPIKey, username, false).apiKey;
    if (!apiKey) {
      throw Boom.badRequest('Error previewing rule: could not create API key');
    }

    const createTime = new Date().toISOString();
    const schedule = calculateSchedule(createTime, data.schedule.interval);

    const adHocSOToCreate: AdHocRunSO = {
      apiKeyId: Buffer.from(apiKey, 'base64').toString().split(':')[0],
      apiKeyToUse: apiKey!,
      createdAt: createTime,
      duration: data.schedule.interval,
      enabled: true,
      executionUuid,
      rule: {
        name: data.name,
        tags: data.tags,
        alertTypeId: data.alertTypeId,
        params: data.params,
        apiKeyOwner: username,
        apiKeyCreatedByUser: false,
        actions: [],
        consumer: data.consumer,
        enabled: true,
        schedule: data.schedule,
        createdBy: username,
        updatedBy: username,
        createdAt: createTime,
        updatedAt: createTime,
        revision: 0,
      },
      spaceId: context.spaceId,
      start: createTime,
      status: adHocRunStatus.PENDING,
      schedule,
    };

    const createdSO: SavedObject<AdHocRunSO> = await context.unsecuredSavedObjectsClient.create(
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
      adHocSOToCreate,
      {
        references: [{ id: temporaryRuleId, name: `rule preview`, type: RULE_SAVED_OBJECT_TYPE }],
      }
    );

    // schedule an ad hoc task
    await context.taskManager.schedule({
      taskType: 'ad_hoc_run-preview',
      params: {
        adHocRunParamsId: createdSO.id,
        spaceId: context.spaceId,
      },
      state: {},
      scope: ['alerting'],
    });

    // poll for event log doc indicating preview completed
    const errorMessage = await checkForPreviewComplete(
      () =>
        context.internalEsClient.search({
          index: '.kibana-event-log*',
          size: 1,
          query: {
            bool: {
              filter: [
                { term: { 'event.action': EVENT_LOG_ACTIONS.executePreview } },
                { term: { 'kibana.alert.rule.execution.uuid': executionUuid } },
              ],
            },
          },
        }),
      { logger: context.logger }
    );

    if (errorMessage) {
      throw new Error(`Preview failed with error ${errorMessage}`);
    }

    // query for alert documents
    const indexTemplateAndPattern = getIndexTemplateAndPattern({ context: PREVIEW_CONTEXT });

    const {
      hits: { hits: alertDocs },
    } = await context.internalEsClient.search<Alert>({
      index: indexTemplateAndPattern.pattern,
      size: 100,
      query: {
        bool: {
          filter: [{ term: { [ALERT_RULE_EXECUTION_UUID]: executionUuid } }],
        },
      },
    });

    // Fill in the action message with the data
    const actionsToPreview = await injectConnectorType(context, data.actions ?? []);

    const rule = {
      ...data,
      enabled: true,
      id: temporaryRuleId,
      actions: actionsToPreview,
      apiKeyOwner: username,
      createdBy: username,
      updatedBy: username,
      createdAt: new Date(createTime),
      updatedAt: new Date(createTime),
      muteAll: false,
      mutedInstanceIds: [],
      revision: 0,
    };

    const previewActions = flatMap(
      actionsToPreview.map((action: RuleAction) => {
        if (action.frequency?.summary === true) {
          return {
            ...action,
            params: transformSummaryActionParams({
              alerts: {
                new: { count: alertDocs.length, data: alertDocs },
                ongoing: { count: 0, data: [] },
                recovered: { count: 0, data: [] },
                all: { count: alertDocs.length, data: alertDocs },
              },
              rule,
              ruleTypeId: ruleType.id,
              actionId: action.id,
              actionParams: action.params,
              spaceId: context.spaceId,
              actionsPlugin: context.actions,
              actionTypeId: action.actionTypeId,
              kibanaBaseUrl: context.kibanaBaseUrl,
              ruleUrl: buildRuleUrl(context, ruleType, rule),
            }),
          };
        } else {
          return alertDocs.map((alertHit: SearchHit<Alert>) => {
            const alert = alertHit._source;
            return {
              ...action,
              params: transformActionParams({
                aadAlert: alert,
                actionsPlugin: context.actions,
                alertId: temporaryRuleId,
                alertType: ruleType.id,
                actionTypeId: action.actionTypeId,
                alertName: data.name,
                spaceId: context.spaceId,
                tags: data.tags,
                alertInstanceId: get(alert, ALERT_INSTANCE_ID, ''),
                alertUuid: get(alert, ALERT_UUID, ''),
                alertActionGroup: get(alert, ALERT_ACTION_GROUP, ''),
                alertActionGroupName: ruleTypeActionGroups!.get(
                  get(alert, ALERT_ACTION_GROUP, '')
                )!,
                context: get(alert, 'context', {}),
                actionId: action.id,
                state: get(alert, 'state', {}),
                kibanaBaseUrl: context.kibanaBaseUrl,
                alertParams: data.params,
                actionParams: action.params,
                flapping: get(alert, ALERT_FLAPPING, false),
                ruleUrl: buildRuleUrl(context, ruleType, rule),
              }),
            };
          });
        }
      })
    );
    return { uuid: executionUuid, alerts: alertDocs, actions: previewActions };
  } catch (error) {
    context.logger.error(`Error previewing rule: ${error.message}`);
  }

  return { uuid: executionUuid, alerts: [], actions: [] };
}

const MAX_ATTEMPTS = 10;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const checkForPreviewComplete = async (
  checkQuery: () => Promise<SearchResponse<IValidatedEvent>>,
  {
    logger,
    attempt = 0,
  }: {
    logger: Logger;
    attempt?: number;
  }
): Promise<string | void> => {
  try {
    const response: SearchResponse<IValidatedEvent> = await checkQuery();
    if (response.hits.hits.length < 1) {
      throw new Error(`preview is not yet complete`);
    }

    const outcome = response.hits.hits[0]._source?.event?.outcome;
    if (outcome === 'failure') {
      return response.hits.hits[0]._source?.error?.message;
    }
  } catch (e) {
    if (attempt < MAX_ATTEMPTS) {
      const retryCount = attempt + 1;
      const retryDelaySec: number = Math.min(Math.pow(2, retryCount), 30); // 2s, 4s, 8s, 16s, 30s, 30s, 30s...

      logger.warn(`Checking again after [${retryDelaySec}s]}`);

      // delay with some randomness
      await delay(retryDelaySec * 1000 * Math.random());
      return checkForPreviewComplete(checkQuery, { logger, attempt: retryCount });
    }

    throw e;
  }
};

const injectConnectorType = async (
  context: RulesClientContext,
  actions: NormalizedAlertAction[]
): Promise<RuleAction[]> => {
  const normalizedActions: RuleAction[] = [];
  const actionsClient = await context.getActionsClient();
  const actionIds = [...new Set(actions.map((action) => action.id))];
  const actionResults = await actionsClient.getBulk({ ids: actionIds });
  actions.forEach((alertAction) => {
    const actionResultValue = actionResults.find((action) => action.id === alertAction.id);
    if (actionResultValue) {
      normalizedActions.push({
        ...alertAction,
        actionTypeId: actionResultValue.actionTypeId,
      });
    }
  });

  return normalizedActions;
};

const buildRuleUrl = (
  context: RulesClientContext,
  ruleType: any,
  rule: any
): string | undefined => {
  if (!context.kibanaBaseUrl) {
    return;
  }

  const relativePath = ruleType.getViewInAppRelativeUrl
    ? ruleType.getViewInAppRelativeUrl({ rule })
    : `${triggersActionsRoute}${getRuleDetailsRoute(rule.id)}`;

  try {
    const ruleUrl = new URL(
      `${context.spaceId !== 'default' ? `/s/${context.spaceId}` : ''}${relativePath}`,
      context.kibanaBaseUrl
    );

    return ruleUrl.toString();
  } catch (error) {
    context.logger.debug(
      `Rule "${rule.id}" encountered an error while constructing the rule.url variable: ${error.message}`
    );
    throw error;
  }
};
