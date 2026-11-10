/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Whether anything offers the editor. Turned off, apps are made and changed by chat, and by the
 * words of an app on its page. On unless a deployment says otherwise, as in kibana.yml:
 * `feature_flags.overrides.customApp.enable_editor: false`.
 */
export const EDITOR_FEATURE_FLAG = 'customApp.enable_editor';
