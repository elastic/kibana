/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PLUGIN_ID } from '../../common';

export const useEvalsPermissions = () => {
  const {
    services: { application },
  } = useKibana();

  const capabilities = application?.capabilities[PLUGIN_ID];

  return {
    canRead: !!capabilities?.show,
    canManage: !!capabilities?.manage,
  };
};
