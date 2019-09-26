/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function EnableMonitoringAlert() {
  return (
    <p>
      <strong>
        <FormattedMessage
          id="xpack.logstash.enableMonitoringAlert.enableMonitoringTitle"
          defaultMessage="Enable monitoring."
        />
      </strong>
      <FormattedMessage
        id="xpack.logstash.enableMonitoringAlert.enableMonitoringDescription"
        defaultMessage="In the {configFileName} file, set {monitoringConfigParam} and {monitoringUiConfigParam} to {trueValue}."
        values={{
          configFileName: <EuiCode>kibana.yml</EuiCode>,
          monitoringConfigParam: <EuiCode>xpack.monitoring.enabled</EuiCode>,
          monitoringUiConfigParam: <EuiCode>xpack.monitoring.ui.enabled</EuiCode>,
          trueValue: <EuiCode>true</EuiCode>,
        }}
      />
    </p>
  );
}
