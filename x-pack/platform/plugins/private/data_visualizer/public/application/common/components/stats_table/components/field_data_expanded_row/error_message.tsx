/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { MLErrorObject } from '@kbn/ml-error-utils';
import { KbnDangerCallout } from '@kbn/ui-callout';

export const ErrorMessageContent = ({
  fieldName,
  error,
}: {
  fieldName: string;
  error: MLErrorObject;
}) => {
  return (
    <KbnDangerCallout
      size="s"
      title={
        <FormattedMessage
          id="xpack.dataVisualizer.index.fieldStatisticsErrorMessage"
          defaultMessage="Error getting statistics for field ''{fieldName}'' because {reason}"
          values={{ fieldName, reason: error.message }}
        />
      }
    />
  );
};
