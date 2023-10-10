/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { ALERT_ACTION_INDEX, HEADERS, KIBANA_DEFAULT_URL, PASSWORD, USERNAME } from './constants';

const INDEX_CONNECTOR_API = `${KIBANA_DEFAULT_URL}/api/actions/connector`;

export const createIndexConnector = async () => {
  const indexConnectorParams = {
    name: 'Test Index Connector',
    config: {
      index: ALERT_ACTION_INDEX,
      refresh: true,
    },
    connector_type_id: '.index',
  };

  return axios.post(INDEX_CONNECTOR_API, indexConnectorParams, {
    headers: HEADERS,
    auth: {
      username: USERNAME,
      password: PASSWORD,
    },
  });
};
