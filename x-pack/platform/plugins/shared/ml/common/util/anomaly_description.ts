/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import { getSeverity, type MlAnomaliesTableRecordExtended } from '@kbn/ml-anomaly-utils';

export function getAnomalyDescription(anomaly: MlAnomaliesTableRecordExtended): {
  anomalyDescription: string;
  mvDescription: string | undefined;
} {
  const source = anomaly.source;

  let anomalyDescription = i18n.translate('xpack.ml.anomalyDescription.anomalyInLabel', {
    defaultMessage: '{anomalySeverity} anomaly in {anomalyDetector}',
    values: {
      anomalySeverity: capitalize(getSeverity(anomaly.severity).label),
      anomalyDetector: anomaly.detector,
    },
  });

  if (anomaly.entityName !== undefined) {
    anomalyDescription += i18n.translate('xpack.ml.anomalyDescription.foundForLabel', {
      defaultMessage: ' found for {anomalyEntityName} {anomalyEntityValue}',
      values: {
        anomalyEntityName: anomaly.entityName,
        anomalyEntityValue: anomaly.entityValue,
      },
    });
  }

  if (
    source.partition_field_name !== undefined &&
    source.partition_field_name !== anomaly.entityName
  ) {
    anomalyDescription += i18n.translate('xpack.ml.anomalyDescription.detectedInLabel', {
      defaultMessage: ' detected in {sourcePartitionFieldName} {sourcePartitionFieldValue}',
      values: {
        sourcePartitionFieldName: source.partition_field_name,
        sourcePartitionFieldValue: source.partition_field_value,
      },
    });
  }

  // Check for a correlatedByFieldValue in the source which will be present for multivariate analyses
  // where the record is anomalous due to relationship with another 'by' field value.
  let mvDescription: string = '';
  if (source.correlated_by_field_value !== undefined) {
    mvDescription = i18n.translate('xpack.ml.anomalyDescription.multivariateDescription', {
      defaultMessage:
        'multivariate correlations found in {sourceByFieldName}; ' +
        '{sourceByFieldValue} is considered anomalous given {sourceCorrelatedByFieldValue}',
      values: {
        sourceByFieldName: source.by_field_name,
        sourceByFieldValue: source.by_field_value,
        sourceCorrelatedByFieldValue: source.correlated_by_field_value,
      },
    });
  }

  return {
    anomalyDescription,
    mvDescription,
  };
}
