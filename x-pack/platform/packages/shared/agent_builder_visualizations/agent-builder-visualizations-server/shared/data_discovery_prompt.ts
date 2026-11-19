/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';

/** Dashboard / visualization-creation agents that must find unnamed data before generating. */
export const dataDiscoveryAgentGuidance = `When the user does not name the data, find it in one \`${platformCoreTools.listIndices}\` call with a broad pattern around the topic (e.g. \`*log*\`, not \`logs-*\`), then call \`${platformCoreTools.getIndexMapping}\` once for the chosen index. Do not query the data before generating; generation writes and runs its own ES|QL.`;
