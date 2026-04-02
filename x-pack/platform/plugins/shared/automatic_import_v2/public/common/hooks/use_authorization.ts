/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';

export interface Authorization {
  /** Kibana Management > Connectors: All (create/update connectors). */
  canCreateConnectors: boolean;
}

export const useAuthorization = (): Authorization => {
  const { capabilities } = useKibana().services.application;
  const { actions } = capabilities;
  return {
    canCreateConnectors: Boolean(actions?.save),
  };
};
