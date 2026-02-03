/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { AGENTBUILDER_APP_ID } from '../../common/features';

export type AgentBuilderLocatorParams = SerializableRecord;

export class AgentBuilderLocatorDefinition implements LocatorDefinition<AgentBuilderLocatorParams> {
  public readonly getLocation = async () => {
    return {
      app: AGENTBUILDER_APP_ID,
      path: '',
      state: {},
    };
  };

  public readonly id = 'AGENT_BUILDER_LOCATOR_ID';
}
