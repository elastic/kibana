/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import * as labels from './translations';
import {
  DownNoExpressionSelect,
  LocationExpressionSelect,
  TimeExpressionSelect,
  FiltersExpressionsSelect,
} from './monitor_expressions';

import { FilterGroup, KueryBar } from '..';

interface AlertMonitorStatusProps {
  autocomplete: DataPublicPluginSetup['autocomplete'];
  enabled: boolean;
  filters: string;
  locations: string[];
  numTimes: number;
  setAlertParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const AlertMonitorStatusComponent: React.FC<AlertMonitorStatusProps> = props => {
  const { filters, locations, setAlertParams } = props;

  useEffect(() => {
    setAlertParams('filters', filters);
  }, [filters, setAlertParams]);

  return (
    <>
      <EuiSpacer size="m" />
      <KueryBar
        aria-label={labels.ALERT_KUERY_BAR_ARIA}
        autocomplete={props.autocomplete}
        data-test-subj="xpack.uptime.alerts.monitorStatus.filterBar"
      />

      <EuiSpacer size="s" />

      <DownNoExpressionSelect filters={filters} setAlertParams={setAlertParams} />

      <EuiSpacer size="xs" />

      <TimeExpressionSelect setAlertParams={setAlertParams} />

      <EuiSpacer size="xs" />

      <FiltersExpressionsSelect setAlertParams={setAlertParams} />

      <EuiSpacer size="xs" />

      <LocationExpressionSelect locations={locations} setAlertParams={setAlertParams} />

      <EuiSpacer size="m" />

      <EuiAccordion
        id="accordion1"
        buttonContent={
          <EuiText>
            <h5>Filters:</h5>
          </EuiText>
        }
      >
        <FilterGroup />
      </EuiAccordion>
      <EuiSpacer size="m" />
    </>
  );
};
