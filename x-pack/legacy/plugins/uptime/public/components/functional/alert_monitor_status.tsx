/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiExpression } from '@elastic/eui';
import { KueryBar } from '../connected';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

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

export const AlertMonitorStatusComponent: React.FC<AlertMonitorStatusProps> = (props: any) => {
  console.log('from presentational component', props);
  return (
    <>
      <KueryBar autocomplete={props.autocomplete} />
      <EuiExpression
        description="Description"
        isActive={false}
        value="WHEN"
        onClick={() => console.log('hi world')}
        color="secondary"
      />
    </>
  );
};
