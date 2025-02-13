/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  RulesSettingsQueryDelay,
  RulesSettingsQueryDelayProperties,
} from '@kbn/alerting-plugin/common';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

const rewriteBodyRes: RewriteRequestCase<RulesSettingsQueryDelay> = ({ ...rest }: any) => ({
  ...rest,
});

export const updateQueryDelaySettings = async ({
  http,
  queryDelaySettings,
}: {
  http: HttpSetup;
  queryDelaySettings: RulesSettingsQueryDelayProperties;
}) => {
  let body: string;
  try {
    body = JSON.stringify({
      delay: queryDelaySettings.delay,
    });
  } catch (e) {
    throw new Error(`Unable to parse query delay settings update params: ${e}`);
  }

  const res = await http.post<AsApiContract<RulesSettingsQueryDelay>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_query_delay`,
    {
      body,
    }
  );

  return rewriteBodyRes(res);
};
