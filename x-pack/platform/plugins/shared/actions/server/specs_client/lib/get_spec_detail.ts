/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpecDetail } from '../../../common/connector_spec';
import type { SpecsClientOpts } from '../types';
import { getRegisteredSpec } from './get_registered_spec';
import { serializeSpecDetail } from './serialize_spec_detail';

export const getSpecDetail = (
  {
    actionTypeRegistry,
    configurationUtilities,
  }: Pick<SpecsClientOpts, 'actionTypeRegistry' | 'configurationUtilities'>,
  id: string
): ConnectorSpecDetail =>
  serializeSpecDetail(getRegisteredSpec(actionTypeRegistry, id), configurationUtilities);
