/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import type { MLErrorObject } from '@kbn/ml-common-types/errors';

export const ErrorMessageContent = ({
  fieldName,
  error,
}: {
  fieldName: string;
  error: MLErrorObject;
}) => {
  return (
    <EuiCallOut heading="p" color="danger" size="s">
      <FormattedMessage
        id="xpack.dataVisualizer.index.fieldStatisticsErrorMessage"
        defaultMessage="Error getting statistics for field ''{fieldName}'' because {reason}"
        values={{ fieldName, reason: error.message }}
      />
    </EuiCallOut>
  );
};
