/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { getPhoenixConfig } from '../../src/utils/get_phoenix_config';

const phoenixConfig = getPhoenixConfig();

const phoenixClientDir = Path.join(__dirname, '../../kibana_phoenix_client');

const generatedGraphQlTypesDir = Path.join(phoenixClientDir, '__generated__');

export { phoenixConfig, phoenixClientDir, generatedGraphQlTypesDir };
