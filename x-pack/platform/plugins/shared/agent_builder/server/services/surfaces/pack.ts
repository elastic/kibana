/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKibanaIsomerRuntime } from '@kbn/isomer';
import { agentBuilderPack } from '../../../common/surfaces/pack';

/** Validates compositions against the Agent Builder pack, and renders them on every surface. */
export const isomerRuntime = createKibanaIsomerRuntime({ packs: [agentBuilderPack] });
