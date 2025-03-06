/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import {
  EnrichedDeprecationInfo,
  ESUpgradeStatus,
  FeatureSet,
  DataStreamExclusions,
  DataStreamsAction,
} from '../../../common/types';
import { getEnrichedDeprecations } from './migrations';
import { getHealthIndicators } from './health_indicators';
import { matchExclusionPattern } from '../data_streams/data_stream_exclusions';

export async function getESUpgradeStatus(
  dataClient: IScopedClusterClient,
  {
    featureSet,
    dataStreamExclusions,
  }: { featureSet: FeatureSet; dataStreamExclusions: DataStreamExclusions }
): Promise<ESUpgradeStatus> {
  const getCombinedDeprecations = async () => {
    const healthIndicators = await getHealthIndicators(dataClient);
    const enrichedDeprecations = await getEnrichedDeprecations(dataClient);

    const toggledMigrationsDeprecations = enrichedDeprecations
      .map((deprecation) => {
        if (deprecation.type === 'data_streams') {
          const excludedActions = matchExclusionPattern(deprecation.index!, dataStreamExclusions);
          (deprecation.correctiveAction as DataStreamsAction).metadata.excludedActions =
            excludedActions;
        }
        return deprecation;
      })
      .filter(({ type, correctiveAction }) => {
        if (type === 'data_streams') {
          const { excludedActions = [] } = (correctiveAction as DataStreamsAction).metadata;
          const allActionsExcluded =
            excludedActions.includes('readOnly') && excludedActions.includes('reindex');

          return !allActionsExcluded;
        }
        return true;
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
    totalCriticalDeprecations: migrationsDeprecations.filter(
      ({ isCritical }) => isCritical === true
    ).length,
    migrationsDeprecations,
    totalCriticalHealthIssues: enrichedHealthIndicators.filter(
      ({ isCritical }) => isCritical === true
    ).length,
    enrichedHealthIndicators,
  };
  return result;
}
