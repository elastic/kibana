import { elasticdump as ElasticDumpCli } from 'elasticdump';
import { fromNode } from 'bluebird';
import { defaults } from 'lodash';
import { createGzip } from 'zlib';
import { createWriteStream } from 'fs';

// copied from https://github.com/taskrabbit/elasticsearch-dump/blob/585adb484099e9d076dc1d8640f1114b804eadc2/bin/elasticdump#L9-L33
const ES_DUMP_DEFAULT_FLAGS = {
  limit:              100,
  offset:             0,
  debug:              false,
  type:               'data',
  delete:             false,
  maxSockets:         null,
  input:              null,
  'input-index':      null,
  output:             null,
  'output-index':     null,
  inputTransport:     null,
  outputTransport:    null,
  searchBody:         null,
  sourceOnly:         false,
  jsonLines:          false,
  format:             '',
  'ignore-errors':    false,
  scrollTime:         '10m',
  timeout:            null,
  toLog:              null,
  quiet:              false,
  awsAccessKeyId:     null,
  awsSecretAccessKey: null,
};

// our modifications to the defaults
const KIBANA_DEFAULT_FLAGS = {
  searchBody: { 'query': { 'match_all': {} }, 'stored_fields': ['*'], '_source': true }
};

export function elasticDump(log, flags) {
  flags = defaults({}, flags, KIBANA_DEFAULT_FLAGS, ES_DUMP_DEFAULT_FLAGS);
  const cli = new ElasticDumpCli(flags.input, flags.output, flags);

  cli.on('log', message => {
    log(message);
  });

  cli.on('error', error => {
    log('error', 'Error Emitted => ' + (error.message || JSON.stringify(error)));
  });

  return fromNode(cb => cli.dump(cb));
}
