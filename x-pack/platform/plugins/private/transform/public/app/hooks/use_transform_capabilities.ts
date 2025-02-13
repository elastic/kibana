/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getInitialTransformCapabilities,
  isTransformCapabilities,
} from '../../../common/types/capabilities';

import { useAppDependencies } from '../app_dependencies';

export const useTransformCapabilities = () => {
  const { application } = useAppDependencies();

  if (isTransformCapabilities(application?.capabilities?.transform)) {
    return application.capabilities.transform;
  }

  return getInitialTransformCapabilities();
};
