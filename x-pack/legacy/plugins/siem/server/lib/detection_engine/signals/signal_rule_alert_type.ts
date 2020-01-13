/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import moment from 'moment';
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
    actionGroups: ['default'],
    validate: {
      params: schema.object({
        createdAt: schema.string(),
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
        threats: schema.nullable(schema.arrayOf(schema.object({}, { allowUnknowns: true }))),
        to: schema.string(),
        type: schema.string(),
        updatedAt: schema.string(),
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
      let ruleStatusSavedObjects;
      ruleStatusSavedObjects = await services.savedObjectsClient.find<
        IRuleSavedAttributesSavedObjectAttributes
      >({
        type: ruleStatusSavedObjectType,
        perPage: 5,
        sortField: 'statusDate',
        sortOrder: 'desc',
        search: `"${alertId}"`,
        searchFields: ['alertId'],
      });
      logger.debug(`ruleStatusSavedObjects: ${JSON.stringify(ruleStatusSavedObjects, null, 4)}`);
      if (ruleStatusSavedObjects.saved_objects.length > 0) {
        // get status objects, update 0th element to executing
        ruleStatusSavedObjects.saved_objects[0].attributes.status = 'executing';
        ruleStatusSavedObjects.saved_objects[0].attributes.statusDate = new Date().toISOString();
        await services.savedObjectsClient.update(
          ruleStatusSavedObjectType,
          ruleStatusSavedObjects.saved_objects[0].id,
          {
            ...ruleStatusSavedObjects.saved_objects[0].attributes,
          }
        );
      } else {
        // create the saved object here
        const date = new Date().toISOString();
        await services.savedObjectsClient.create<IRuleSavedAttributesSavedObjectAttributes>(
          ruleStatusSavedObjectType,
          {
            alertId: `"${alertId}"`, // do a search for this id.
            statusDate: date,
            status: 'executing',
            lastFailureAt: '1970-01-01T00:00:00Z', // default to unix epoch time
            lastSuccessAt: '1970-01-01T00:00:00Z',
            lastFailureMessage: '',
            lastSuccessMessage: '',
          }
        );
        ruleStatusSavedObjects = await services.savedObjectsClient.find<
          IRuleSavedAttributesSavedObjectAttributes
        >({
          type: ruleStatusSavedObjectType,
          perPage: 5,
          sortField: 'statusDate',
          sortOrder: 'desc',
          search: `"${alertId}"`,
          searchFields: ['alertId'],
        });
      }
      // then in the end of the executor delete all statuses
      // based on relevant alertIds
      // then create a new status saved object with bulk create

      const name: string = savedObject.attributes.name;
      const tags: string[] = savedObject.attributes.tags;

      const createdBy: string = savedObject.attributes.createdBy;
      const updatedBy: string = savedObject.attributes.updatedBy;
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
            updatedBy,
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
            ruleStatusSavedObjects.saved_objects[0].attributes.status = 'succeeded';
            ruleStatusSavedObjects.saved_objects[0].attributes.statusDate = sDate;
            ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessAt = sDate;
            ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessMessage = 'succeeded';
            await services.savedObjectsClient.update(
              ruleStatusSavedObjectType,
              ruleStatusSavedObjects.saved_objects[0].id,
              {
                ...ruleStatusSavedObjects.saved_objects[0].attributes,
              }
            );
          } else {
            logger.error(
              `Error processing signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
            );

            if (ruleStatusSavedObjects.saved_objects.length < 5) {
              // create new status with same alertId
              const sDate = new Date().toISOString();
              await services.savedObjectsClient.create(ruleStatusSavedObjectType, {
                alertId, // do a search for this id.
                statusDate: sDate,
                status: 'failed',
                lastFailureAt: sDate,
                lastSuccessAt: ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessAt,
                lastFailureMessage: 'There was an error!!',
                lastSuccessMessage:
                  ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessMessage,
              });
            } else {
              // delete all statuses with same alertId, then bulk create
              ruleStatusSavedObjects.saved_objects.forEach(async obj =>
                services.savedObjectsClient.delete(ruleStatusSavedObjectType, obj.id)
              );
              const sDate = new Date().toISOString();
              const newStatus = ruleStatusSavedObjects.saved_objects[0];
              newStatus.attributes = {
                alertId,
                statusDate: sDate,
                status: 'failed',
                lastFailureAt: sDate,
                lastSuccessAt: ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessAt,
                lastFailureMessage: 'There was an error!!',
                lastSuccessMessage:
                  ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessMessage,
              };

              // drop the 5th status, insert new one at 0th index.
              await services.savedObjectsClient.bulkCreate([
                newStatus,
                ...ruleStatusSavedObjects.saved_objects.slice(0, 5),
              ]);
            }
          }
        } catch (err) {
          // TODO: Error handling and writing of errors into a signal that has error
          // handling/conditions
          logger.error(
            `Error from signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}"`
          );
          if (ruleStatusSavedObjects.saved_objects.length < 5) {
            // create new status with same alertId
            const sDate = new Date().toISOString();
            await services.savedObjectsClient.create(ruleStatusSavedObjectType, {
              alertId,
              statusDate: sDate,
              status: 'failed',
              lastFailureAt: sDate,
              lastSuccessAt: ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessAt,
              lastFailureMessage: 'There was an error!!',
              lastSuccessMessage:
                ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessMessage,
            });
          } else {
            // delete all statuses with same alertId, then bulk create
            ruleStatusSavedObjects.saved_objects.forEach(async obj =>
              services.savedObjectsClient.delete(ruleStatusSavedObjectType, obj.id)
            );
            const sDate = new Date().toISOString();
            const newStatus = ruleStatusSavedObjects.saved_objects[0];
            newStatus.attributes = {
              alertId,
              statusDate: sDate,
              status: 'failed',
              lastFailureAt: sDate,
              lastSuccessAt: ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessAt,
              lastFailureMessage: err.message,
              lastSuccessMessage:
                ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessMessage,
            };

            // drop the 5th status, insert new one at 0th index.
            await services.savedObjectsClient.bulkCreate([
              newStatus,
              ...ruleStatusSavedObjects.saved_objects.slice(0, 5),
            ]);
          }
        }
      } catch (exception) {
        logger.error(
          `Error from signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}" message: ${err.message}`
        );
        if (ruleStatusSavedObjects.saved_objects.length < 5) {
          // create new status with same alertId
          const sDate = new Date().toISOString();
          await services.savedObjectsClient.create(ruleStatusSavedObjectType, {
            alertId,
            statusDate: sDate,
            status: 'failed',
            lastFailureAt: sDate,
            lastSuccessAt: ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessAt,
            lastFailureMessage: JSON.stringify(exception, null, 4),
            lastSuccessMessage:
              ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessMessage,
          });
        } else {
          // delete all statuses with same alertId, then bulk create
          ruleStatusSavedObjects.saved_objects.forEach(async obj =>
            services.savedObjectsClient.delete(ruleStatusSavedObjectType, obj.id)
          );
          const sDate = new Date().toISOString();
          const newStatus = ruleStatusSavedObjects.saved_objects[0];
          newStatus.attributes = {
            alertId,
            statusDate: sDate,
            status: 'failed',
            lastFailureAt: sDate,
            lastSuccessAt: ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessAt,
            lastFailureMessage: JSON.stringify(exception, null, 4),
            lastSuccessMessage:
              ruleStatusSavedObjects.saved_objects[0].attributes.lastSuccessMessage,
          };

          // drop the 5th status, insert new one at 0th index.
          await services.savedObjectsClient.bulkCreate([
            newStatus,
            ...ruleStatusSavedObjects.saved_objects.slice(0, 5),
          ]);
        }
      }
    },
  };
};
