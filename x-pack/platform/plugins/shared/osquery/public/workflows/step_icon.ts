/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export const OsqueryStepIcon: React.LazyExoticComponent<
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = React.lazy(() =>
  import('@elastic/eui/es/components/icon/assets/logo_osquery').then(({ icon }) => ({
    default: icon,
  }))
);
