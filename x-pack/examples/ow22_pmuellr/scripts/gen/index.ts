#!/usr/bin/env deno run --allow-read --allow-write
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { generateConfigSchema } from './config_schema.ts';
export { generateMarkdown } from './markdown.ts';
export { generateTypeScriptTypes } from './typescript_types.ts';
