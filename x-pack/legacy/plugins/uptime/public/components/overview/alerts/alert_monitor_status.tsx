/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import * as labels from './translations';
import { AlertExpressionPopover } from './alert_expression_popover';
import { AlertFieldNumber } from './alert_field_number';
import { LocationExpressionSelect } from './monitor_expressions/location_expression_select';
import { TimeExpressionSelect } from './monitor_expressions/time_expression_select';
import { FiltersExpressionsSelect } from './monitor_expressions/filters_expression_select';
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
  const [numTimes, setNumTimes] = useState<number>(5);

  useEffect(() => {
    setAlertParams('numTimes', numTimes);
  }, [numTimes, setAlertParams]);

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

      <EuiSpacer size="s" />
      <AlertExpressionPopover
        aria-label={labels.OPEN_THE_POPOVER_DOWN_COUNT}
        content={
          <AlertFieldNumber
            aria-label={labels.ENTER_NUMBER_OF_DOWN_COUNTS}
            data-test-subj="xpack.uptime.alerts.monitorStatus.numTimesField"
            disabled={false}
            fieldValue={numTimes}
            setFieldValue={setNumTimes}
          />
        }
        data-test-subj="xpack.uptime.alerts.monitorStatus.numTimesExpression"
        description={filters ? labels.MATCHING_MONITORS_DOWN : labels.ANY_MONITOR_DOWN}
        id="ping-count"
        value={`${numTimes} times`}
      />

      <EuiSpacer size="xs" />
      <FiltersExpressionsSelect />
      <EuiSpacer size="xs" />
      <TimeExpressionSelect setAlertParams={setAlertParams} />
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
