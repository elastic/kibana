/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Single source of truth for the alerting_v2 Stack Management section id and
 * the app ids registered underneath it.
 *
 * Both the browser plugin (which calls `management.sections.register` /
 * `registerApp`) and the server plugin (which threads these ids into
 * `KibanaFeatureConfig.management` so the features plugin can enforce navlink
 * authorization) must agree on these values.
 */

export const ALERTING_V2_SECTION_ID = 'alertingV2';

export const ALERTING_V2_RULES_APP_ID = 'rules';
export const ALERTING_V2_ACTION_POLICIES_APP_ID = 'action_policies';
export const ALERTING_V2_EPISODES_APP_ID = 'episodes';
export const ALERTING_V2_EXECUTION_HISTORY_APP_ID = 'execution_history';
