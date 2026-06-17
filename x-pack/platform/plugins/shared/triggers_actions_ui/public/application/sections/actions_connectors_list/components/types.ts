/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionConnector, EditConnectorTabs } from '../../../../types';

export interface EditConnectorProps {
  initialConnector?: ActionConnector;
  tab?: EditConnectorTabs;
  isFix?: boolean;
}
