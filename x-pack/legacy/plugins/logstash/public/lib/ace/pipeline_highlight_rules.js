/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const ace = require('brace');
const oop = ace.acequire('ace/lib/oop');
const {
  TextHighlightRules
} = ace.acequire('ace/mode/text_highlight_rules');

const LOGSTASH_FILTER_PLUGINS = [
  'aggregate',
  'alter',
  'bytes',
  'cidr',
  'cipher',
  'clone',
  'csv',
  'date',
  'de_dot',
  'dissect',
  'dns',
  'drop',
  'elapsed',
  'elasticsearch',
  'environment',
  'extractnumbers',
  'fingerprint',
  'geoip',
  'grok',
  'http',
  'i18n',
  'java_uuid',
  'jdbc_static',
  'jdbc_streaming',
  'json',
  'json_encode',
  'kv',
  'memcached',
  'metricize',
  'metrics',
  'mutate',
  'prune',
  'range',
  'ruby',
  'sleep',
  'split',
  'syslog_pri',
  'threats_classifier',
  'throttle',
  'tld',
  'translate',
  'truncate',
  'urldecode',
  'useragent',
  'uuid',
  'xml'
];

const LOGSTASH_INPUT_PLUGINS = [
  'azure_event_hubs',
  'beats',
  'cloudwatch',
  'couchdb_changes',
  'dead_letter_queue',
  'elasticsearch',
  'exec',
  'file',
  'ganglia',
  'gelf',
  'generator',
  'github',
  'google_cloud_storage',
  'google_pubsub',
  'graphite',
  'heartbeat',
  'http',
  'http_poller',
  'imap',
  'irc',
  'java_generator',
  'java_stdin',
  'jdbc',
  'jms',
  'jmx',
  'kafka',
  'kinesis',
  'log4j',
  'lumberjack',
  'meetup',
  'pipe',
  'puppet_facter',
  'rabbitmq',
  'redis',
  'relp',
  'rss',
  's3',
  'salesforce',
  'snmp',
  'snmptrap',
  'sqlite',
  'sqs',
  'stdin',
  'stomp',
  'syslog',
  'tcp',
  'twitter',
  'udp',
  'unix',
  'varnishlog',
  'websocket',
  'wmi',
  'xmpp'
];

const LOGSTASH_OUTPUT_PLUGINS = [
  'boundary',
  'circonus',
  'cloudwatch',
  'csv',
  'datadog',
  'datadog_metrics',
  'elastic_app_search',
  'elasticsearch',
  'email',
  'exec',
  'file',
  'ganglia',
  'gelf',
  'google_bigquery',
  'google_cloud_storage',
  'google_pubsub',
  'graphite',
  'graphtastic',
  'http',
  'influxdb',
  'irc',
  'java_sink',
  'java_stdout',
  'juggernaut',
  'kafka',
  'librato',
  'loggly',
  'lumberjack',
  'metriccatcher',
  'mongodb',
  'nagios',
  'nagios_nsca',
  'opentsdb',
  'pagerduty',
  'pipe',
  'rabbitmq',
  'redis',
  'redmine',
  'riak',
  'riemann',
  's3',
  'sns',
  'solr_http',
  'sqs',
  'statsd',
  'stdout',
  'stomp',
  'syslog',
  'tcp',
  'timber',
  'udp',
  'webhdfs',
  'websocket',
  'xmpp',
  'zabbix'
];

export function PipelineHighlightRules() {
  this.name = 'PipelineHighlightRules';
  this.$rules = {
    'start': [
      {
        token: 'comment',
        regex: '#.*$'
      },
      {
        token: 'constant.numeric',
        regex: '\\s\\d+'
      },
      {
        token: 'entity.name.function',
        regex: LOGSTASH_FILTER_PLUGINS.join('|')
      },
      {
        token: 'entity.name.function',
        regex: LOGSTASH_INPUT_PLUGINS.join('|')
      },
      {
        token: 'entity.name.function',
        regex: LOGSTASH_OUTPUT_PLUGINS.join('|')
      },
      {
        token: 'storage.type',
        regex: 'input|filter|output'
      },
      {
        token: 'string',
        regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
      },
      {
        token: 'string',
        regex: '[\'](?:(?:\\\\.)|(?:[^\'\\\\]))*?[\']'
      },
      {
        token: 'keyword.operator',
        regex: '!|\\$|%|&|\\*|\\-\\-|\\-|\\+\\+|\\+|~|===|==|=|!=|!==|!|&&|\\|\\||\\?\\:|\\*=|%=|\\+=|\\-=|&=|\\^=|\\b(?:in|not)'
      },
      {
        token: 'paren.lparen',
        regex: '[({]'
      },
      {
        token: 'paren.rparen',
        regex: '[)}]'
      }
    ]
  };

  this.normalizeRules();
}

oop.inherits(PipelineHighlightRules, TextHighlightRules);
