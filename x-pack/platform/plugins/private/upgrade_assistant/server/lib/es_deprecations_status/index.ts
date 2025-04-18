/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  EnrichedDeprecationInfo,
  ESUpgradeStatus,
  FeatureSet,
  DataSourceExclusions,
  DataStreamsAction,
  ReindexAction,
} from '../../../common/types';
import { getEnrichedDeprecations } from './migrations';
import { getHealthIndicators } from './health_indicators';
import { matchExclusionPattern } from '../data_source_exclusions';

export async function getESUpgradeStatus(
  dataClient: ElasticsearchClient,
  {
    featureSet,
    dataSourceExclusions,
  }: { featureSet: FeatureSet; dataSourceExclusions: DataSourceExclusions }
): Promise<ESUpgradeStatus> {
  const getCombinedDeprecations = async () => {
    const healthIndicators = await getHealthIndicators(dataClient);
    const enrichedDeprecations = await getEnrichedDeprecations(dataClient);

    // Get all indices with reindex actions to fetch their sizes
    const indicesNeedingSize = enrichedDeprecations
      .filter(
        (deprecation) => deprecation.correctiveAction?.type === 'reindex' && deprecation.index
      )
      .map((deprecation) => deprecation.index!);

    // Get index stats if we have indices that need size information
    let indexSizes: Record<string, number> = {};
    if (indicesNeedingSize.length > 0) {
      try {
        const response = await dataClient.indices.stats({
          index: indicesNeedingSize,
          metric: ['store'],
        });

        // Extract index sizes from response
        indexSizes = Object.entries(response.indices || {}).reduce((acc, [indexName, stats]) => {
          acc[indexName] = stats.total?.store?.size_in_bytes || 0;
          return acc;
        }, {} as Record<string, number>);
      } catch (error) {
        // If we can't get sizes, continue without them
        // Log error but continue without index sizes
        // eslint-disable-next-line no-console
        console.error('Error fetching index sizes:', error);
      }
    }

    const toggledMigrationsDeprecations = enrichedDeprecations
      .map((deprecation) => {
        const correctiveActionType = deprecation.correctiveAction?.type;
        if (correctiveActionType === 'dataStream') {
          const excludedActions = matchExclusionPattern(deprecation.index!, dataSourceExclusions);
          (deprecation.correctiveAction as DataStreamsAction).metadata.excludedActions =
            excludedActions;
        } else if (correctiveActionType === 'reindex') {
          const excludedActions = matchExclusionPattern(deprecation.index!, dataSourceExclusions);
          (deprecation.correctiveAction as ReindexAction).excludedActions = excludedActions;

          // Add index size information if available
          if (deprecation.index && indexSizes[deprecation.index]) {
            (deprecation.correctiveAction as ReindexAction).indexSizeInBytes =
              indexSizes[deprecation.index];
          }
        }
        return deprecation;
      })
      .filter(({ correctiveAction }) => {
        const correctiveActionType = correctiveAction?.type;
        switch (correctiveActionType) {
          // Only show the deprecation if there are actions that are not excluded
          // This only applies to data streams since normal reindexing shows a "delete" manual option.
          case 'dataStream': {
            const { excludedActions } = (correctiveAction as DataStreamsAction).metadata;

            // nothing exlcuded, keep the deprecation
            if (!excludedActions || !excludedActions.length) {
              return true;
            }

            // if all actions are excluded, don't show the deprecation
            const allActionsExcluded =
              excludedActions.includes('readOnly') && excludedActions.includes('reindex');

            return !allActionsExcluded;
          }
          case 'reindex':
          default: {
            return true;
          }
        }
      })
      .filter(({ type, correctiveAction }) => {
        /**
         * This disables showing the ML deprecations in the UA if `featureSet.mlSnapshots`
         * is set to `false`.
         *
         * This config should be set to true only on the `x.last` versions, or when
         * the constant `MachineLearningField.MIN_CHECKED_SUPPORTED_SNAPSHOT_VERSION`
         * is incremented to something higher than 7.0.0 in the Elasticsearch code.
         */
        if (type === 'ml_settings' || correctiveAction?.type === 'mlSnapshot') {
          return featureSet.mlSnapshots;
        }

        /**
         * This disables showing the Data streams deprecations in the UA if
         * `featureSet.migrateDataStreams` is set to `false`.
         */
        if (type === 'data_streams') {
          return !!featureSet.migrateDataStreams;
        }

        /**
         * This disables showing the reindexing deprecations in the UA if
         * `featureSet.reindexCorrectiveActions` is set to `false`.
         */
        if (correctiveAction?.type === 'reindex') {
          return !!featureSet.reindexCorrectiveActions;
        }

        return true;
      });

    const enrichedHealthIndicators = healthIndicators.filter(({ status }) => {
      return status !== 'green';
    }) as EnrichedDeprecationInfo[];

    return {
      enrichedHealthIndicators,
      migrationsDeprecations: toggledMigrationsDeprecations,
    };
  };
  const { enrichedHealthIndicators, migrationsDeprecations } = await getCombinedDeprecations();

  const result = {
    totalCriticalDeprecations: migrationsDeprecations.filter(({ level }) => level === 'critical')
      .length,
    migrationsDeprecations,
    totalCriticalHealthIssues: enrichedHealthIndicators.filter(({ level }) => level === 'critical')
      .length,
    enrichedHealthIndicators,
  };
  return result;
}
