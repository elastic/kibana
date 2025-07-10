/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  RulesSettingsFlapping,
  RulesSettingsFlappingProperties,
} from '@kbn/alerting-plugin/common';
import type { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

const rewriteBodyRes: RewriteRequestCase<RulesSettingsFlapping> = ({
  look_back_window: lookBackWindow,
  status_change_threshold: statusChangeThreshold,
  ...rest
}: any) => ({
  ...rest,
  lookBackWindow,
  statusChangeThreshold,
});

export const updateFlappingSettings = async ({
  http,
  flappingSettings,
}: {
  http: HttpSetup;
  flappingSettings: RulesSettingsFlappingProperties;
}) => {
  let body: string;
  try {
    body = JSON.stringify({
      enabled: flappingSettings.enabled,
      look_back_window: flappingSettings.lookBackWindow,
      status_change_threshold: flappingSettings.statusChangeThreshold,
    });
  } catch (e) {
    throw new Error(`Unable to parse flapping settings update params: ${e}`);
  }

  const res = await http.post<AsApiContract<RulesSettingsFlapping>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_flapping`,
    {
      body,
    }
  );

  return rewriteBodyRes(res);
};
