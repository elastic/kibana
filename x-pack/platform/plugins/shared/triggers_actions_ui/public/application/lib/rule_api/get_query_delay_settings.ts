/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import { RulesSettingsQueryDelay } from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

const rewriteBodyRes: RewriteRequestCase<RulesSettingsQueryDelay> = ({ ...rest }: any) => ({
  ...rest,
});

export const getQueryDelaySettings = async ({ http }: { http: HttpSetup }) => {
  const res = await http.get<AsApiContract<RulesSettingsQueryDelay>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_query_delay`
  );
  return rewriteBodyRes(res);
};
