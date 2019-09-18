/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

export const LogAnalysisJobConfigurationSection: React.FunctionComponent = () => {
  return (
    <EuiDescriptionList type="column">
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.infra.logs.analysis.jobStatusPopover.indicesConfigurationLabel"
          defaultMessage="Indices"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>placeholder</EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
};
