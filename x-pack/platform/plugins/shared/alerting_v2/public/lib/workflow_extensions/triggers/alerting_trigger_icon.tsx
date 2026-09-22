/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/**
 * Shared icon for all alerting-category triggers. Lazily imports the EUI Bell
 * icon so it stays out of the plugin's page-load bundle.
 */
export const AlertingTriggerIcon: React.ComponentType = React.lazy(() =>
  import('@elastic/eui/es/components/icon/assets/bell').then(({ icon }) => ({
    default: icon,
  }))
);
