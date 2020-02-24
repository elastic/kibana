/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createFilebeatConfig(
  index: string,
  results: any,
  indexPatternId: string,
  ingestPipelineId: string,
  username: string | null
) {
  return [
    'filebeat.inputs:',
    `- type: ${index}`,
    '  paths:',
    "  - '<add path to your files here>'",
    ...getEncoding(results),
    ...getExcludeLines(results),
    ...getMultiline(results),
    '',
    ...getProcessors(results),
    'output.elasticsearch:',
    ...getHosts(results),
    ...getUserDetails(username),
    `  index: "${index}"`,
    `  pipeline: "${ingestPipelineId}"`,
  ].join('\n');
}

function getEncoding(results: any) {
  return results.charset !== 'UTF-8' ? [`  encoding: ${results.charset}`] : [];
}

function getExcludeLines(results: any) {
  return results.exclude_lines_pattern !== undefined
    ? [`  exclude_lines: ['${results.exclude_lines_pattern}']`]
    : [];
}

function getMultiline(results: any) {
  return results.multiline_start_pattern !== undefined
    ? [
        '  multiline:',
        `    pattern: '${results.multiline_start_pattern}'`,
        '    match: after',
        '    negate: true',
      ]
    : [];
}

function getProcessors(results: any) {
  return results.need_client_timezone === true ? ['processors:', '- add_locale: ~', ''] : [];
}

function getHosts(results: any) {
  return ['  hosts:["<es_url>"]'];
}

function getUserDetails(username: string | null) {
  if (username !== null) {
    return [`  username: "${username}"`, '  password: "<password>"'];
  } else {
    return [];
  }
}
