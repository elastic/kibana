/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

import { FleetServerFlyout } from '.';

const FleetServerFlyoutComponent = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div style={{ width: 900 }}>
      <EuiButton size="m" fill color="primary" onClick={() => setIsOpen(true)}>
        Show flyout
      </EuiButton>
      {isOpen && <FleetServerFlyout onClose={() => setIsOpen(false)} />}
    </div>
  );
};

export default {
  component: FleetServerFlyoutComponent,
  title: 'Sections/Fleet/Agents/Fleet Server Instructions/In Flyout',
  args: {
    isCloudEnabled: false,
  },
};
