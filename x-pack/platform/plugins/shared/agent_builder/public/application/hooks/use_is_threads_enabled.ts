/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { AGENT_BUILDER_THREADS_SETTING_ID } from '@kbn/management-settings-ids';

/** Whether thread entry points (the `/thread` command, Open thread, nested sidebar threads) are shown. */
export const useIsThreadsEnabled = (): boolean => {
  return useUiSetting<boolean>(AGENT_BUILDER_THREADS_SETTING_ID, false);
};
