/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import {
  SIGNALS_ID,
  DEFAULT_MAX_SIGNALS,
  DEFAULT_SEARCH_AFTER_PAGE_SIZE,
} from '../../../../common/constants';

import { buildEventsSearchQuery } from './build_events_query';
import { getInputIndex } from './get_input_output_index';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { getFilter } from './get_filter';
import { SignalRuleAlertTypeDefinition } from './types';
import { getGapBetweenRuns } from './utils';
import { ruleStatusSavedObjectType } from '../rules/saved_object_mappings';
import { IRuleSavedAttributesSavedObjectAttributes } from '../rules/types';

export const signalRulesAlertType = ({
  logger,
  version,
}: {
  logger: Logger;
  version: string;
}): SignalRuleAlertTypeDefinition => {
  return {
    id: SIGNALS_ID,
    name: 'SIEM Signals',
    actionGroups: [
      {
        id: 'default',
        name: i18n.translate('xpack.siem.detectionEngine.signalRuleAlert.actionGroups.default', {
          defaultMessage: 'Default',
        }),
      },
    ],
    validate: {
      params: schema.object({
        description: schema.string(),
        falsePositives: schema.arrayOf(schema.string(), { defaultValue: [] }),
        from: schema.string(),
        ruleId: schema.string(),
        immutable: schema.boolean({ defaultValue: false }),
        index: schema.nullable(schema.arrayOf(schema.string())),
        language: schema.nullable(schema.string()),
        outputIndex: schema.nullable(schema.string()),
        savedId: schema.nullable(schema.string()),
        timelineId: schema.nullable(schema.string()),
        timelineTitle: schema.nullable(schema.string()),
        meta: schema.nullable(schema.object({}, { allowUnknowns: true })),
        query: schema.nullable(schema.string()),
        filters: schema.nullable(schema.arrayOf(schema.object({}, { allowUnknowns: true }))),
        maxSignals: schema.number({ defaultValue: DEFAULT_MAX_SIGNALS }),
        riskScore: schema.number(),
        severity: schema.string(),
        threat: schema.nullable(schema.arrayOf(schema.object({}, { allowUnknowns: true }))),
        to: schema.string(),
        type: schema.string(),
        references: schema.arrayOf(schema.string(), { defaultValue: [] }),
        version: schema.number({ defaultValue: 1 }),
      }),
    },
    // fun fact: previousStartedAt is not actually a Date but a String of a date
    async executor({ previousStartedAt, alertId, services, params }) {
      const {
        from,
        ruleId,
        index,
        filters,
        language,
        outputIndex,
        savedId,
        query,
        to,
        type,
      } = params;
      // TODO: Remove this hard extraction of name once this is fixed: https://github.com/elastic/kibana/issues/50522
      const savedObject = await services.savedObjectsClient.get('alert', alertId);
      const ruleStatusSavedObjects = await services.savedObjectsClient.find<
        IRuleSavedAttributesSavedObjectAttributes
      >({
        type: ruleStatusSavedObjectType,
        perPage: 6, // 0th element is current status, 1-5 is last 5 failures.
        sortField: 'statusDate',
        sortOrder: 'desc',
        search: `${alertId}`,
        searchFields: ['alertId'],
      });
      let currentStatusSavedObject;
      if (ruleStatusSavedObjects.saved_objects.length === 0) {
        // create
        const date = new Date().toISOString();
        currentStatusSavedObject = await services.savedObjectsClient.create<
          IRuleSavedAttributesSavedObjectAttributes
        >(ruleStatusSavedObjectType, {
          alertId, // do a search for this id.
          statusDate: date,
          status: 'going to run',
          lastFailureAt: null,
          lastSuccessAt: null,
          lastFailureMessage: null,
          lastSuccessMessage: null,
        });
      } else {
        // update 0th to executing.
        currentStatusSavedObject = ruleStatusSavedObjects.saved_objects[0];
        const sDate = new Date().toISOString();
        currentStatusSavedObject.attributes.status = 'going to run';
        currentStatusSavedObject.attributes.statusDate = sDate;
        await services.savedObjectsClient.update(
          ruleStatusSavedObjectType,
          currentStatusSavedObject.id,
          {
            ...currentStatusSavedObject.attributes,
          }
        );
      }

      const name: string = savedObject.attributes.name;
      const tags: string[] = savedObject.attributes.tags;

      const createdBy: string = savedObject.attributes.createdBy;
      const createdAt: string = savedObject.attributes.createdAt;
      const updatedBy: string = savedObject.attributes.updatedBy;
      const updatedAt: string = savedObject.updated_at ?? '';
      const interval: string = savedObject.attributes.schedule.interval;
      const enabled: boolean = savedObject.attributes.enabled;
      const gap = getGapBetweenRuns({
        previousStartedAt: previousStartedAt != null ? moment(previousStartedAt) : null, // TODO: Remove this once previousStartedAt is no longer a string
        interval,
        from,
        to,
      });
      if (gap != null && gap.asMilliseconds() > 0) {
        logger.warn(
          `Signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}" has a time gap of ${gap.humanize()} (${gap.asMilliseconds()}ms), and could be missing signals within that time. Consider increasing your look behind time or adding more Kibana instances.`
        );
        // write a failure status whenever we have a time gap
        // this is a temporary solution until general activity
        // monitoring is developed as a feature
        const gapDate = new Date().toISOString();
        await services.savedObjectsClient.create(ruleStatusSavedObjectType, {
          alertId,
          statusDate: gapDate,
          status: 'failed',
          lastFailureAt: gapDate,
          lastSuccessAt: currentStatusSavedObject.attributes.lastSuccessAt,
          lastFailureMessage: `Signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}" has a time gap of ${gap.humanize()} (${gap.asMilliseconds()}ms), and could be missing signals within that time. Consider increasing your look behind time or adding more Kibana instances.`,
          lastSuccessMessage: currentStatusSavedObject.attributes.lastSuccessMessage,
        });

        if (ruleStatusSavedObjects.saved_objects.length >= 6) {
          // delete fifth status and prepare to insert a newer one.
          const toDelete = ruleStatusSavedObjects.saved_objects.slice(5);
          await toDelete.forEach(async item =>
            services.savedObjectsClient.delete(ruleStatusSavedObjectType, item.id)
          );
        }
      }
      // set searchAfter page size to be the lesser of default page size or maxSignals.
      const searchAfterSize =
        DEFAULT_SEARCH_AFTER_PAGE_SIZE <= params.maxSignals
          ? DEFAULT_SEARCH_AFTER_PAGE_SIZE
          : params.maxSignals;
      try {
        const inputIndex = await getInputIndex(services, version, index);
        const esFilter = await getFilter({
          type,
          filters,
          language,
          query,
          savedId,
          services,
          index: inputIndex,
        });

        const noReIndex = buildEventsSearchQuery({
          index: inputIndex,
          from,
          to,
          filter: esFilter,
          size: searchAfterSize,
          searchAfterSortId: undefined,
        });

        try {
          logger.debug(
            `Starting signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
          );
          logger.debug(
            `[+] Initial search call of signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
          );
          const noReIndexResult = await services.callCluster('search', noReIndex);
          if (noReIndexResult.hits.total.value !== 0) {
            logger.info(
              `Found ${
                noReIndexResult.hits.total.value
              } signals from the indexes of "[${inputIndex.join(
                ', '
              )}]" using signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}", pushing signals to index "${outputIndex}"`
            );
          }

          const bulkIndexResult = await searchAfterAndBulkCreate({
            someResult: noReIndexResult,
            ruleParams: params,
            services,
            logger,
            id: alertId,
            signalsIndex: outputIndex,
            filter: esFilter,
            name,
            createdBy,
            createdAt,
            updatedBy,
            updatedAt,
            interval,
            enabled,
            pageSize: searchAfterSize,
            tags,
          });

          if (bulkIndexResult) {
            logger.debug(
              `Finished signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
            );
            const sDate = new Date().toISOString();
            currentStatusSavedObject.attributes.status = 'succeeded';
            currentStatusSavedObject.attributes.statusDate = sDate;
            currentStatusSavedObject.attributes.lastSuccessAt = sDate;
            currentStatusSavedObject.attributes.lastSuccessMessage = 'succeeded';
            await services.savedObjectsClient.update(
              ruleStatusSavedObjectType,
              currentStatusSavedObject.id,
              {
                ...currentStatusSavedObject.attributes,
              }
            );
          } else {
            logger.error(
              `Error processing signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
            );
            const sDate = new Date().toISOString();
            currentStatusSavedObject.attributes.status = 'failed';
            currentStatusSavedObject.attributes.statusDate = sDate;
            currentStatusSavedObject.attributes.lastFailureAt = sDate;
            currentStatusSavedObject.attributes.lastFailureMessage = `Bulk Indexing signals failed. Check logs for further details \nRule name: "${name}"\nid: "${alertId}"\nrule_id: "${ruleId}"\n`;
            // current status is failing
            await services.savedObjectsClient.update(
              ruleStatusSavedObjectType,
              currentStatusSavedObject.id,
              {
                ...currentStatusSavedObject.attributes,
              }
            );
            // create new status for historical purposes
            await services.savedObjectsClient.create(ruleStatusSavedObjectType, {
              ...currentStatusSavedObject.attributes,
            });

            if (ruleStatusSavedObjects.saved_objects.length >= 6) {
              // delete fifth status and prepare to insert a newer one.
              const toDelete = ruleStatusSavedObjects.saved_objects.slice(5);
              await toDelete.forEach(async item =>
                services.savedObjectsClient.delete(ruleStatusSavedObjectType, item.id)
              );
            }
          }
        } catch (err) {
          logger.error(
            `Error from signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}", ${err.message}`
          );
          const sDate = new Date().toISOString();
          currentStatusSavedObject.attributes.status = 'failed';
          currentStatusSavedObject.attributes.statusDate = sDate;
          currentStatusSavedObject.attributes.lastFailureAt = sDate;
          currentStatusSavedObject.attributes.lastFailureMessage = err.message;
          // current status is failing
          await services.savedObjectsClient.update(
            ruleStatusSavedObjectType,
            currentStatusSavedObject.id,
            {
              ...currentStatusSavedObject.attributes,
            }
          );
          // create new status for historical purposes
          await services.savedObjectsClient.create(ruleStatusSavedObjectType, {
            ...currentStatusSavedObject.attributes,
          });

          if (ruleStatusSavedObjects.saved_objects.length >= 6) {
            // delete fifth status and prepare to insert a newer one.
            const toDelete = ruleStatusSavedObjects.saved_objects.slice(5);
            await toDelete.forEach(async item =>
              services.savedObjectsClient.delete(ruleStatusSavedObjectType, item.id)
            );
          }
        }
      } catch (exception) {
        logger.error(
          `Error from signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}" message: ${exception.message}`
        );
        const sDate = new Date().toISOString();
        currentStatusSavedObject.attributes.status = 'failed';
        currentStatusSavedObject.attributes.statusDate = sDate;
        currentStatusSavedObject.attributes.lastFailureAt = sDate;
        currentStatusSavedObject.attributes.lastFailureMessage = exception.message;
        // current status is failing
        await services.savedObjectsClient.update(
          ruleStatusSavedObjectType,
          currentStatusSavedObject.id,
          {
            ...currentStatusSavedObject.attributes,
          }
        );
        // create new status for historical purposes
        await services.savedObjectsClient.create(ruleStatusSavedObjectType, {
          ...currentStatusSavedObject.attributes,
        });

        if (ruleStatusSavedObjects.saved_objects.length >= 6) {
          // delete fifth status and prepare to insert a newer one.
          const toDelete = ruleStatusSavedObjects.saved_objects.slice(5);
          await toDelete.forEach(async item =>
            services.savedObjectsClient.delete(ruleStatusSavedObjectType, item.id)
          );
        }
      }
    },
  };
};
