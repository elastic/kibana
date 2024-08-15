/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { HEADERS } from './constants';

export const createRule = async (kibanaUrl: string, ruleParams: any) => {
  const RULE_CREATION_API = `${kibanaUrl}/api/alerting/rule`;
  return axios.post(RULE_CREATION_API, ruleParams, {
    headers: HEADERS
  });
};


export const findRulesByName = async (kibanaUrl: string, ruleParams: any) => {
  const RULE_FIND_API = `${kibanaUrl}/api/alerting/rules/_find?fields=[\"id\"]&search_fields=name&search=${ruleParams.name}*`;
  return axios.get(RULE_FIND_API, {
    headers: HEADERS
  });
};

export const deleteRule = async (kibanaUrl: string, ruleRespose: { id: string, actions: [] }) => {
  const RULE_DELETE_API = `${kibanaUrl}/api/alerting/rule/${ruleRespose.id}`;
  return axios.delete(RULE_DELETE_API, {
    headers: HEADERS
  });
};