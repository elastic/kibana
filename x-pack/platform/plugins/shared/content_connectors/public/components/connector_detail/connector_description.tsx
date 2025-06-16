/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Connector } from '@kbn/search-connectors';

import { ConnectorField } from './connector_field';

export const ConnectorDescription: React.FC<{ connector: Connector }> = ({ connector }) => (
  <ConnectorField connector={connector} field="description" />
);
