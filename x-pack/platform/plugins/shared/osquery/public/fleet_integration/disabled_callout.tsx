/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const DisabledCalloutComponent = () => (
  <>
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate('xpack.osquery.fleetIntegration.saveIntegrationCalloutTitle', {
            defaultMessage: 'Save the integration to access the options below',
          })}
          iconType="save"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer />
  </>
);

export const DisabledCallout = React.memo(DisabledCalloutComponent);
