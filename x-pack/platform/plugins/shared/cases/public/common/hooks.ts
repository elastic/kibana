/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STACK_APP_ID } from '../../common/constants';
import { useApplication } from './lib/kibana/use_application';

export const useIsMainApplication = () => {
  const { appId } = useApplication();

  return appId === STACK_APP_ID;
};
