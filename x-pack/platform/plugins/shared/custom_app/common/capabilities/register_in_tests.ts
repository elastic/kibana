/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerRunWorkflowStandIn } from '../actions/run_workflow_stand_in';
import { registerBuiltinCapabilities } from './manifests';

// Documents are checked against what is registered, so the tests start with what ships registered.
registerBuiltinCapabilities();
registerRunWorkflowStandIn();
