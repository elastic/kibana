/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection } from 'geojson';
import { asyncForEach } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { FEATURE_VISIBLE_PROPERTY_NAME } from '../../../../../common/constants';
import { DataRequestContext } from '../../../../actions';
import { JoinState } from '../types';
import { isTermJoinSource, type ITermJoinSource } from '../../../sources/join_sources';

interface SourceResult {
  refreshed: boolean;
  featureCollection: FeatureCollection;
}

export async function performInnerJoins(
  sourceResult: SourceResult,
  joinStates: JoinState[],
  updateSourceData: DataRequestContext['updateSourceData'],
  setJoinError: DataRequestContext['setJoinError']
) {
  // should update the store if
  // -- source result was refreshed
  // -- any of the join configurations changed (joinState changed)
  // -- visibility of any of the features has changed

  let shouldUpdateStore =
    sourceResult.refreshed || joinStates.some((joinState) => joinState.dataHasChanged);

  if (!shouldUpdateStore) {
    return;
  }

  const joinStatuses = joinStates.map((joinState) => {
    return {
      joinedWithAtLeastOneFeature: false,
      keys: [] as string[],
      joinState,
    };
  });

  for (let i = 0; i < sourceResult.featureCollection.features.length; i++) {
    const feature = sourceResult.featureCollection.features[i];
    if (!feature.properties) {
      feature.properties = {};
    }
    const oldVisbility = feature.properties[FEATURE_VISIBLE_PROPERTY_NAME];
    let isFeatureVisible = true;
    for (let j = 0; j < joinStates.length; j++) {
      const joinState = joinStates[j];
      const innerJoin = joinState.join;
      const joinStatus = joinStatuses[j];
      const joinKey = innerJoin.getJoinKey(feature);
      if (joinKey !== null) {
        joinStatus.keys.push(joinKey);
      }
      const canJoinOnCurrent = joinState.joinMetrics
        ? innerJoin.joinPropertiesToFeature(feature, joinState.joinMetrics)
        : false;
      if (canJoinOnCurrent && !joinStatus.joinedWithAtLeastOneFeature) {
        joinStatus.joinedWithAtLeastOneFeature = true;
      }
      isFeatureVisible = isFeatureVisible && canJoinOnCurrent;
    }

    if (oldVisbility !== isFeatureVisible) {
      shouldUpdateStore = true;
    }

    feature.properties[FEATURE_VISIBLE_PROPERTY_NAME] = isFeatureVisible;
  }

  if (shouldUpdateStore) {
    updateSourceData({ ...sourceResult.featureCollection });
  }

  //
  // term joins are easy to misconfigure.
  // Users often are unaware of left values and right values and whether they allign for joining
  // Provide messaging that helps users debug joins with no matches
  //
  await asyncForEach(joinStatuses, async (joinStatus) => {
    setJoinError(joinStatus.joinState.joinIndex, await getJoinError(joinStatus));
  });
}

function prettyPrintArray(array: unknown[]) {
  return array.length <= 5
    ? array.join(',')
    : array.slice(0, 5).join(',') +
        i18n.translate('xpack.maps.vectorLayer.joinError.firstTenMsg', {
          defaultMessage: ` (5 of {total})`,
          values: { total: array.length },
        });
}

async function getJoinError(joinStatus: {
  joinedWithAtLeastOneFeature: boolean;
  keys: string[];
  joinState: JoinState;
}): Promise<string | undefined> {
  if (!isTermJoinSource(joinStatus.joinState.join.getRightJoinSource())) {
    return;
  }

  const hasTerms = joinStatus.joinState.joinMetrics && joinStatus.joinState.joinMetrics.size > 0;

  if (!hasTerms || joinStatus.joinedWithAtLeastOneFeature) {
    return;
  }

  const leftFieldName = await joinStatus.joinState.join.getLeftField().getLabel();
  const termJoinSource = joinStatus.joinState.join.getRightJoinSource() as ITermJoinSource;
  const rightFieldName = await termJoinSource.getTermField().getLabel();
  return joinStatus.keys.length === 0
    ? i18n.translate('xpack.maps.vectorLayer.joinError.noLeftFieldValuesMsg', {
        defaultMessage: `Left field: ''{leftFieldName}'', did not provide any values.`,
        values: { leftFieldName },
      })
    : i18n.translate('xpack.maps.vectorLayer.joinError.noMatchesMsg', {
        defaultMessage: `Left field values do not match right field values. Left field: ''{leftFieldName}'' has values: {leftFieldValues}. Right field: ''{rightFieldName}'' has values: {rightFieldValues}.`,
        values: {
          leftFieldName,
          leftFieldValues: prettyPrintArray(joinStatus.keys),
          rightFieldName,
          rightFieldValues: prettyPrintArray(Array.from(joinStatus.joinState.joinMetrics!.keys())),
        },
      });
}
