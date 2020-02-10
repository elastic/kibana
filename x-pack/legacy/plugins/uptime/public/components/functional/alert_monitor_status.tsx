/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiExpression, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { KueryBar } from '../connected';

interface AlertMonitorStatusProps {
  autocomplete: any;
  enabled: boolean;
  filters?: string;
  locations: string[];
  numTimes: number;
  timerange: {
    from: string;
    to: string;
  };
}

// WHEN ANY PING MATCHING [kql]
// IS [status] MORE THAN [numtimes] times
// WITHIN [timerange]
// IN [location option]

export const AlertMonitorStatusComponent: React.FC<AlertMonitorStatusProps> = (props: any) => {
  const [numTimes, setNumTimes] = useState<number>(5);
  return (
    <>
      <KueryBar autocomplete={props.autocomplete} />
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiExpression
            description="alert when any ping is down more than"
            isActive={false}
            value={`${numTimes} times`}
            onClick={() => console.log('hi world')}
            color="secondary"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiExpression
            description="WITHIN"
            isActive={false}
            value="last 15 minutes"
            onClick={() => console.log('hi world')}
            color="secondary"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiExpression
            description="in"
            isActive={false}
            value="fairbanks, us-east-2"
            onClick={() => console.log('hi')}
            color="secondary"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
