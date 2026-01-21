/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type MlAnomaliesTableRecordExtended } from '@kbn/ml-anomaly-utils';

export function getAnomalyDescription(
  anomaly: MlAnomaliesTableRecordExtended,
  options: {
    // Used in anomaly detection alerting rule to break auto linkify for field names in email clients.
    breakAutoLinkifyFieldName: boolean;
  } = {
    breakAutoLinkifyFieldName: false,
  }
): {
  anomalyDescription: string;
  mvDescription: string | undefined;
} {
  const { breakAutoLinkifyFieldName } = options;
  const source = anomaly.source;

  let anomalyDescription = i18n.translate('xpack.ml.anomalyDescription.anomalyInLabel', {
    defaultMessage: 'Anomaly in {anomalyDetector}',
    values: {
      anomalyDetector: anomaly.detector,
    },
  });

  if (anomaly.entityName !== undefined) {
    anomalyDescription += i18n.translate('xpack.ml.anomalyDescription.foundForLabel', {
      defaultMessage: ' found for {anomalyEntityName} {anomalyEntityValue}',
      values: {
        anomalyEntityName: breakAutoLinkifyFieldName
          ? `${anomaly.entityName}-`
          : anomaly.entityName,
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
        sourcePartitionFieldName: breakAutoLinkifyFieldName
          ? `${source.partition_field_name}-`
          : source.partition_field_name,
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
        sourceByFieldName: breakAutoLinkifyFieldName
          ? `${source.by_field_name}-`
          : source.by_field_name,
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
