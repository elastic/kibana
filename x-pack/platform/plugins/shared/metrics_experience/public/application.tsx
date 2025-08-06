/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppMountParameters, CoreStart } from '@kbn/core/public';

interface ApplicationProps {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;
}

export const Application: React.FC<ApplicationProps> = () => {
  return <div>Metrics Experience</div>;
};
