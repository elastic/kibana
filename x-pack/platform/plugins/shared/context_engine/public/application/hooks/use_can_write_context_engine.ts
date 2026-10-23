/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uiPrivileges } from '../../../common/features';
import { useKibana } from './use_kibana';

export const useCanWriteContextEngine = (): boolean => {
  const {
    services: { application },
  } = useKibana();

  return application?.capabilities.contextEngine?.[uiPrivileges.write] === true;
};
