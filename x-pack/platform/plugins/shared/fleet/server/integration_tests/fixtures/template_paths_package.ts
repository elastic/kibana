/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fixture package content for template_paths integration test.
 * Builds a minimal EPR package that uses template_paths for one input and one stream.
 * Used to produce template_paths_test-1.0.0.zip for upload-based integration testing.
 */

const PKG_NAME = 'template_paths_test';
const PKG_VERSION = '1.0.0';
const PKG_KEY = `${PKG_NAME}-${PKG_VERSION}`;
const DATA_STREAM_PATH = 'logs';

export const TEMPLATE_PATHS_FIXTURE = {
  pkgKey: PKG_KEY,
  pkgName: PKG_NAME,
  pkgVersion: PKG_VERSION,
  dataStreamPath: DATA_STREAM_PATH,

  topLevelManifest: `name: ${PKG_NAME}
version: ${PKG_VERSION}
title: Template Paths Test
owner:
  github: elastic/integrations
description: Minimal package for template_paths integration test.
policy_templates:
  - name: logs
    title: Logs
    description: Collect log data
    inputs:
      - type: log
        title: Log
        template_paths:
          - input_first.yml.hbs
          - input_second.yml.hbs
`,

  dataStreamManifest: `title: Logs
type: logs
dataset: ${PKG_NAME}.${DATA_STREAM_PATH}
streams:
  - input: log
    title: Log
    template_paths:
      - stream_first.yml.hbs
      - stream_second.yml.hbs
`,

  inputFirstYml: `hosts:
{{#each hosts}}
  - {{this}}
{{/each}}
`,

  inputSecondYml: `hosts:
  - remote
timeout: 30s
`,

  streamFirstYml: `type: log
metricset:
  - ${DATA_STREAM_PATH}
paths:
{{#each paths}}
  - {{this}}
{{/each}}
`,

  streamSecondYml: `processors:
  - add_host: ~
config:
  b: 2
  c: 3
`,
};

export function getZipEntries(): Array<{ name: string; content: string | Buffer }> {
  const p = TEMPLATE_PATHS_FIXTURE;
  const prefix = `${p.pkgKey}/`;
  const dsPrefix = `${prefix}data_stream/${p.dataStreamPath}/`;
  return [
    { name: `${prefix}manifest.yml`, content: p.topLevelManifest },
    { name: `${dsPrefix}manifest.yml`, content: p.dataStreamManifest },
    { name: `${prefix}agent/input/input_first.yml.hbs`, content: p.inputFirstYml },
    { name: `${prefix}agent/input/input_second.yml.hbs`, content: p.inputSecondYml },
    { name: `${dsPrefix}agent/stream/stream_first.yml.hbs`, content: p.streamFirstYml },
    { name: `${dsPrefix}agent/stream/stream_second.yml.hbs`, content: p.streamSecondYml },
  ];
}
