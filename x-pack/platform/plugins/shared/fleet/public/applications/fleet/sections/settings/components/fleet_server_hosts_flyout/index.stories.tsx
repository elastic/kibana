/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FleetServerHostsFlyout as Component } from '.';

export default {
  component: Component,
  title: 'Sections/Fleet/Settings/FleetServerHostFlyout',
};

interface Args {
  width: number;
}

const args: Args = {
  width: 1200,
};
const fleetServerHost = {
  id: 'id1',
  name: 'fleet server 1',
  host_urls: ['https://host1.fr:8220', 'https://host2-with-a-longer-name.fr:8220'],
  is_default: false,
  is_preconfigured: false,
};

export const FleetServerHostsFlyout = ({ width }: Args) => {
  return (
    <div style={{ width }}>
      <Component proxies={[]} onClose={() => {}} fleetServerHost={fleetServerHost} />
    </div>
  );
};

FleetServerHostsFlyout.args = args;
