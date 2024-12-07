/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { ALERT_ACTION_INDEX, HEADERS } from './constants';

export const createIndexConnector = async (kibanaUrl: string) => {
  const INDEX_CONNECTOR_API = `${kibanaUrl}/api/actions/connector`;
  const indexConnectorParams = {
    name: 'Test Index Connector',
    config: {
      index: ALERT_ACTION_INDEX,
      refresh: true,
    },
    connector_type_id: '.index',
  };

  return axios.post(INDEX_CONNECTOR_API, indexConnectorParams, {
    headers: HEADERS
  });
};

export const getConnectors = async (kibanaUrl: string) => {
  const INDEX_CONNECTOR_API = `${kibanaUrl}/api/actions/connectors`;
  return axios.get(INDEX_CONNECTOR_API, {
    headers: HEADERS
  });
};

export const deleteIndexConnector = async (kibanaUrl: string, connectorId: string) => {
  const INDEX_CONNECTOR_API = `${kibanaUrl}/api/actions/connector/${connectorId}`;

  return axios.delete(INDEX_CONNECTOR_API, {
    headers: HEADERS
  });
};