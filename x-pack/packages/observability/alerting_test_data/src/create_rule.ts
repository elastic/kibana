/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { HEADERS, KIBANA_DEFAULT_URL, PASSWORD, USERNAME } from './constants';

const RULE_CREATION_API = `${KIBANA_DEFAULT_URL}/api/alerting/rule`;

export const createRule = async (ruleParams: any) =>
  axios.post(RULE_CREATION_API, ruleParams, {
    headers: HEADERS,
    auth: {
      username: USERNAME,
      password: PASSWORD,
    },
  });
