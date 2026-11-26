/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Lives in the contract package so the pinned-baseline routes in the agent_builder
// plugin snapshot score documents with the same exclusions this plugin reads them with.
export { UNBOUNDED_SCORE_FIELDS } from '@kbn/evals-common';
