/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import { FleetServerOnPremUnhealthyCallout as FleetServerOnPremUnhealthyCalloutComponent } from './fleet_server_on_prem_unhealthy_callout';
import { FleetServerCloudUnhealthyCallout as FleetServerCloudUnhealthyCalloutComponent } from './fleet_server_cloud_unhealthy_callout';
import { FleetServerOnPremRequiredCallout as FleetServerOnPremRequiredCalloutComponent } from './fleet_server_on_prem_required_callout';

interface Args {
  width: number;
}

export const FleetServerCallouts = {
  render: ({ width }: Args) => {
    return (
      <div style={{ width }}>
        <FleetServerCloudUnhealthyCalloutComponent deploymentUrl="https://linktoclouddeployment/deployment123" />
        <EuiSpacer size="m" />
        <FleetServerOnPremUnhealthyCalloutComponent onClickAddFleetServer={() => {}} />
        <EuiSpacer size="m" />
        <FleetServerOnPremRequiredCalloutComponent />
      </div>
    );
  },

  args: {
    width: 900,
  } as Args,
};

export const FleetServerCloudUnhealthyCallout = {
  render: ({ width }: Args) => {
    return (
      <div style={{ width }}>
        <FleetServerCloudUnhealthyCalloutComponent deploymentUrl="https://linktoclouddeployment/deployment123" />
      </div>
    );
  },

  args: {
    width: 900,
  } as Args,
};

export const FleetServerOnPremUnhealthyCallout = {
  render: ({ width }: Args) => {
    return (
      <div style={{ width }}>
        <FleetServerOnPremUnhealthyCalloutComponent onClickAddFleetServer={() => {}} />
      </div>
    );
  },

  args: {
    width: 900,
  } as Args,
};

export const FleetServerOnPremRequiredCallout = {
  render: ({ width }: Args) => {
    return (
      <div style={{ width }}>
        <FleetServerOnPremRequiredCalloutComponent />
      </div>
    );
  },

  args: {
    width: 900,
  } as Args,
};

export default {
  component: FleetServerCallouts,
  title: 'Sections/Fleet/Agents/FleetServerCallouts',
};
