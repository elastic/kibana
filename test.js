/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { spawn } = require('child_process');
const { func } = require('prop-types');

const dockerArgs = [
  `run`,
  `--name=enterprise-search-ftr`,
  `-p`,
  `3002:3002`,
  `-e`,
  `elasticsearch.host='http://host.docker.internal:9220'`,
  `-e`,
  `elasticsearch.username=elastic`,
  `-e`,
  `elasticsearch.password=changeme`,
  `-e`,
  `allow_es_settings_modification=true`,
  `-e`,
  `secret_management.encryption_keys=[4a2cd3f81d39bf28738c10db0ca782095ffac07279561809eecc722e0c20eb09]`,
  `-e`,
  `ENT_SEARCH_DEFAULT_PASSWORD=changeme`,
  `-e`,
  `ent_search.listen_port=3002`,
  `-e`,
  `ent_search.external_url='http://localhost:3002'`,
  `docker.elastic.co/enterprise-search/enterprise-search:8.6.0-SNAPSHOT`,
];

const start = async () => {
  await new Promise(() => {
    console.log('start');
    spawn('docker', dockerArgs, { stdio: 'inherit' });
  });
};

start();
