/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';

export interface PartitionFieldsRequiredCalloutProps {
  fieldNamesWithEmptyValues: string[];
}

export const PartitionFieldsRequiredCallout: React.FC<PartitionFieldsRequiredCalloutProps> = ({
  fieldNamesWithEmptyValues,
}) => {
  if (fieldNamesWithEmptyValues.length === 0) {
    return null;
  }

  return (
    <>
      <KbnInfoCallout
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.singleMetricRequiredMessage"
            defaultMessage="To view a single metric, select {missingValuesCount, plural, one {a value for {fieldName1}} other {values for {fieldName1} and {fieldName2}}}."
            values={{
              missingValuesCount: fieldNamesWithEmptyValues.length,
              fieldName1: fieldNamesWithEmptyValues[0],
              fieldName2: fieldNamesWithEmptyValues[1],
            }}
          />
        }
        size="s"
      />
      <EuiSpacer size="m" />
    </>
  );
};
