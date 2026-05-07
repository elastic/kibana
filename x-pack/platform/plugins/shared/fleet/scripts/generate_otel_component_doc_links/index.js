/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');
require('./generate_otel_component_doc_links').run();

/*
Usage:

cd x-pack/platform/plugins/shared/fleet
GITHUB_TOKEN=ghp_xxx node scripts/generate_otel_component_doc_links/index.js

*/
