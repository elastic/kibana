/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices, useCasesConfig, useKibana } from '../../../../common/lib/kibana';

/**
 * The room is an Agent Builder conversation, so it needs Agent Builder (and Cases chat) to load at
 * all; without Agent Builder access the room is hidden rather than shown empty.
 */
export const useIsRoomAvailable = (): boolean => {
  const { agentBuilder, application } = useKibana().services;
  const { agenticEnabled } = useCasesConfig();
  return (
    agenticEnabled &&
    KibanaServices.getConfig()?.chat?.enabled === true &&
    agentBuilder != null &&
    application?.capabilities?.agentBuilder?.show === true
  );
};
