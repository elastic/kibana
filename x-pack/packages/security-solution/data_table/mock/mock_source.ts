/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { BrowserFields } from '@kbn/timelines-plugin/common';

const DEFAULT_INDEX_PATTERN = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'traces-apm*',
  'winlogbeat-*',
  '-*elastic-cloud-logs-*',
];

export const mockBrowserFields: BrowserFields = {
  agent: {
    fields: {
      'agent.ephemeral_id': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'agent.ephemeral_id',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'agent.hostname': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'agent.hostname',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'agent.id': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'agent.id',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'agent.name': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'agent.name',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
    },
  },
  auditd: {
    fields: {
      'auditd.data.a0': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat'],
        name: 'auditd.data.a0',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'auditd.data.a1': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat'],
        name: 'auditd.data.a1',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'auditd.data.a2': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat'],
        name: 'auditd.data.a2',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
    },
  },
  base: {
    fields: {
      '@timestamp': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: '@timestamp',
        searchable: true,
        type: 'date',
        esTypes: ['date'],
        readFromDocValues: true,
      },
      _id: {
        name: '_id',
        type: 'string',
        esTypes: [],
        searchable: true,
        aggregatable: false,
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
      },
      message: {
        name: 'message',
        type: 'string',
        esTypes: ['text'],
        searchable: true,
        aggregatable: false,
        format: 'string',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
      },
    },
  },
  client: {
    fields: {
      'client.address': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'client.address',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'client.bytes': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'client.bytes',
        searchable: true,
        type: 'number',
        esTypes: ['long'],
      },
      'client.domain': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'client.domain',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'client.geo.country_iso_code': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'client.geo.country_iso_code',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
    },
  },
  cloud: {
    fields: {
      'cloud.account.id': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'cloud.account.id',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'cloud.availability_zone': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'cloud.availability_zone',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
    },
  },
  container: {
    fields: {
      'container.id': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'container.id',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'container.image.name': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'container.image.name',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'container.image.tag': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'container.image.tag',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
    },
  },
  destination: {
    fields: {
      'destination.address': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'destination.address',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'destination.bytes': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'destination.bytes',
        searchable: true,
        type: 'number',
        esTypes: ['long'],
      },
      'destination.domain': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'destination.domain',
        searchable: true,
        type: 'string',
        esTypes: ['keyword'],
      },
      'destination.ip': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'destination.ip',
        searchable: true,
        type: 'ip',
        esTypes: ['ip'],
      },
      'destination.port': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'destination.port',
        searchable: true,
        type: 'number',
        esTypes: ['long'],
      },
    },
  },
  event: {
    fields: {
      'event.end': {
        format: '',
        indexes: DEFAULT_INDEX_PATTERN,
        name: 'event.end',
        searchable: true,
        type: 'date',
        esTypes: ['date'],
        aggregatable: true,
      },
      'event.action': {
        name: 'event.action',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        format: 'string',
        indexes: DEFAULT_INDEX_PATTERN,
      },
      'event.category': {
        name: 'event.category',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        format: 'string',
        indexes: DEFAULT_INDEX_PATTERN,
      },
      'event.severity': {
        name: 'event.severity',
        type: 'number',
        esTypes: ['long'],
        format: 'number',
        searchable: true,
        aggregatable: true,
        indexes: DEFAULT_INDEX_PATTERN,
      },
    },
  },
  host: {
    fields: {
      'host.name': {
        name: 'host.name',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        format: 'string',
        indexes: DEFAULT_INDEX_PATTERN,
      },
    },
  },
  source: {
    fields: {
      'source.ip': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'source.ip',
        searchable: true,
        type: 'ip',
        esTypes: ['ip'],
      },
      'source.port': {
        aggregatable: true,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'source.port',
        searchable: true,
        type: 'number',
        esTypes: ['long'],
      },
    },
  },
  user: {
    fields: {
      'user.name': {
        name: 'user.name',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: true,
        format: 'string',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
      },
    },
  },
  nestedField: {
    fields: {
      'nestedField.firstAttributes': {
        aggregatable: false,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'nestedField.firstAttributes',
        searchable: true,
        type: 'string',
        subType: {
          nested: {
            path: 'nestedField',
          },
        },
      },
      'nestedField.secondAttributes': {
        aggregatable: false,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'nestedField.secondAttributes',
        searchable: true,
        type: 'string',
        subType: {
          nested: {
            path: 'nestedField',
          },
        },
      },
      'nestedField.thirdAttributes': {
        aggregatable: false,
        format: '',
        indexes: ['auditbeat', 'filebeat', 'packetbeat'],
        name: 'nestedField.thirdAttributes',
        searchable: true,
        type: 'date',
        subType: {
          nested: {
            path: 'nestedField',
          },
        },
      },
    },
  },
};

export const mockRuntimeMappings: MappingRuntimeFields = {
  '@a.runtime.field': {
    script: {
      source: 'emit("Radical dude: " + doc[\'host.name\'].value)',
    },
    type: 'keyword',
  },
};
