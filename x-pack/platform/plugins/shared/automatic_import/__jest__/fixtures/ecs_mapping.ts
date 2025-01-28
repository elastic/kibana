/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsMappingState } from '../../server/types';
import { SamplesFormatName } from '../../common';

export const ecsMappingExpectedResults = {
  mapping: {
    mysql_enterprise: {
      audit: {
        test_array: null,
        timestamp: {
          target: '@timestamp',
          confidence: 0.99,
          type: 'date',
          date_formats: ['yyyy-MM-dd HH:mm:ss'],
        },
        id: null,
        class: null,
        cpu_usage: {
          target: 'host.cpu.usage',
          confidence: 0.99,
          type: 'number',
          date_formats: [],
        },
        bytes: {
          target: 'network.bytes',
          confidence: 0.99,
          type: 'number',
          date_formats: [],
        },
        account: {
          user: {
            target: 'user.name',
            type: 'string',
            date_formats: [],
            confidence: 1,
          },
          ip: {
            target: 'source.ip',
            type: 'string',
            date_formats: [],
            confidence: 1,
          },
        },
        event: {
          target: 'event.action',
          confidence: 0.8,
          type: 'string',
          date_formats: [],
        },
      },
    },
  },
  pipeline: {
    description: 'Pipeline to process mysql_enterprise audit logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          tag: 'set_ecs_version',
          value: '8.11.0',
        },
      },
      {
        set: {
          copy_from: 'message',
          field: 'originalMessage',
          tag: 'copy_original_message',
        },
      },
      {
        rename: {
          field: 'originalMessage',
          target_field: 'event.original',
          tag: 'rename_message',
          ignore_missing: true,
          if: 'ctx.event?.original == null',
        },
      },
      {
        remove: {
          field: 'originalMessage',
          if: 'ctx.event?.original != null',
          ignore_missing: true,
          tag: 'remove_copied_message',
        },
      },
      {
        remove: {
          field: 'message',
          ignore_missing: true,
          tag: 'remove_message',
        },
      },
      {
        json: {
          field: 'event.original',
          tag: 'json_original',
          target_field: 'mysql_enterprise.audit',
        },
      },
      {
        script: {
          description: 'Ensures the date processor does not receive an array value.',
          lang: 'painless',
          source:
            'if (ctx.mysql_enterprise?.audit?.timestamp != null &&\n    ctx.mysql_enterprise.audit.timestamp instanceof ArrayList){\n    ctx.mysql_enterprise.audit.timestamp = ctx.mysql_enterprise.audit.timestamp[0];\n}\n',
          tag: 'script_convert_array_to_string',
        },
      },
      {
        date: {
          field: 'mysql_enterprise.audit.timestamp',
          tag: 'date_processor_mysql_enterprise.audit.timestamp',
          target_field: '@timestamp',
          formats: ['yyyy-MM-dd HH:mm:ss'],
          if: 'ctx.mysql_enterprise?.audit?.timestamp != null',
        },
      },
      {
        rename: {
          field: 'mysql_enterprise.audit.cpu_usage',
          target_field: 'host.cpu.usage',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'mysql_enterprise.audit.bytes',
          target_field: 'network.bytes',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'mysql_enterprise.audit.account.user',
          target_field: 'user.name',
          ignore_missing: true,
        },
      },
      {
        convert: {
          field: 'mysql_enterprise.audit.account.ip',
          target_field: 'source.ip',
          ignore_missing: true,
          ignore_failure: true,
          type: 'ip',
        },
      },
      {
        rename: {
          field: 'mysql_enterprise.audit.event',
          target_field: 'event.action',
          ignore_missing: true,
        },
      },
      {
        script: {
          description: 'Drops null/empty values recursively.',
          tag: 'script_drop_null_empty_values',
          lang: 'painless',
          source:
            'boolean dropEmptyFields(Object object) {\n  if (object == null || object == "") {\n    return true;\n  } else if (object instanceof Map) {\n    ((Map) object).values().removeIf(value -> dropEmptyFields(value));\n    return (((Map) object).size() == 0);\n  } else if (object instanceof List) {\n    ((List) object).removeIf(value -> dropEmptyFields(value));\n    return (((List) object).length == 0);\n  }\n  return false;\n}\ndropEmptyFields(ctx);\n',
        },
      },
      {
        geoip: {
          field: 'source.ip',
          tag: 'geoip_source_ip',
          target_field: 'source.geo',
          ignore_missing: true,
        },
      },
      {
        geoip: {
          ignore_missing: true,
          database_file: 'GeoLite2-ASN.mmdb',
          field: 'source.ip',
          tag: 'geoip_source_asn',
          target_field: 'source.as',
          properties: ['asn', 'organization_name'],
        },
      },
      {
        rename: {
          field: 'source.as.asn',
          tag: 'rename_source_as_asn',
          target_field: 'source.as.number',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'source.as.organization_name',
          tag: 'rename_source_as_organization_name',
          target_field: 'source.as.organization.name',
          ignore_missing: true,
        },
      },
      {
        geoip: {
          field: 'destination.ip',
          tag: 'geoip_destination_ip',
          target_field: 'destination.geo',
          ignore_missing: true,
        },
      },
      {
        geoip: {
          database_file: 'GeoLite2-ASN.mmdb',
          field: 'destination.ip',
          tag: 'geoip_destination_asn',
          target_field: 'destination.as',
          properties: ['asn', 'organization_name'],
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'destination.as.asn',
          tag: 'rename_destination_as_asn',
          target_field: 'destination.as.number',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'destination.as.organization_name',
          tag: 'rename_destination_as_organization_name',
          target_field: 'destination.as.organization.name',
          ignore_missing: true,
        },
      },
      {
        remove: {
          field: ['mysql_enterprise.audit.account.ip'],
          ignore_missing: true,
          tag: 'remove_fields',
        },
      },
      {
        remove: {
          field: 'event.original',
          tag: 'remove_original_event',
          if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
          ignore_failure: true,
          ignore_missing: true,
        },
      },
    ],
    on_failure: [
      {
        append: {
          field: 'error.message',
          value:
            'Processor {{{_ingest.on_failure_processor_type}}} with tag {{{_ingest.on_failure_processor_tag}}} in pipeline {{{_ingest.on_failure_pipeline}}} failed with message: {{{_ingest.on_failure_message}}}',
        },
      },
      {
        set: {
          field: 'event.kind',
          value: 'pipeline_error',
        },
      },
    ],
  },
};

export const ecsInitialMappingMockedResponse = {
  mysql_enterprise: {
    audit: {
      test_array: null,
      timestamp: {
        target: 'event.action',
        confidence: 0.99,
        type: 'string',
        date_formats: ['yyyy-MM-dd HH:mm:ss'],
      },
      class: null,
      id: {
        target: 'file.code_signature.trusted',
        confidence: 0.99,
        type: 'boolean',
        date_formats: [],
      },
      cpu_usage: {
        target: 'host.cpu.usage',
        confidence: 0.99,
        type: 'number',
        date_formats: [],
      },
      bytes: {
        target: 'network.bytes',
        confidence: 0.99,
        type: 'number',
        date_formats: [],
      },
      account: {
        user: {
          target: 'user.name',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
        ip: {
          target: 'source.ip',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
      },
      event: {
        target: 'event.action',
        confidence: 0.8,
        type: 'string',
        date_formats: [],
      },
    },
  },
};

export const ecsDuplicateMockedResponse = {
  mysql_enterprise: {
    audit: {
      test_array: null,
      timestamp: {
        target: '@timestamp',
        confidence: 0.99,
        type: 'date',
        date_formats: ['yyyy-MM-dd HH:mm:ss'],
      },
      id: null,
      bytes: {
        target: 'network.bytes',
        confidence: 0.99,
        type: 'number',
        date_formats: [],
      },
      account: {
        user: {
          target: 'user.name',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
        ip: {
          target: 'source.ip',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
      },
    },
  },
};

export const ecsMissingKeysMockedResponse = {
  mysql_enterprise: {
    audit: {
      test_array: null,
      timestamp: {
        target: '@timestamp',
        confidence: 0.99,
        type: 'date',
        date_formats: ['yyyy-MM-dd HH:mm:ss'],
      },
      id: null,
      class: null,
      cpu_usage: {
        target: 'host.cpu.usage',
        confidence: 0.99,
        type: 'number',
        date_formats: [],
      },
      bytes: {
        target: 'network.bytes',
        confidence: 0.99,
        type: 'number',
        date_formats: [],
      },
      account: {
        user: {
          target: 'user.name',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
        ip: {
          target: 'source.ip',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
      },
      event: {
        target: 'invalid.ecs.field',
        confidence: 0.8,
        type: 'string',
        date_formats: [],
      },
    },
  },
};

export const ecsInvalidMappingMockedResponse = {
  mysql_enterprise: {
    audit: {
      test_array: null,
      timestamp: {
        target: '@timestamp',
        confidence: 0.99,
        type: 'date',
        date_formats: ['yyyy-MM-dd HH:mm:ss'],
      },
      id: null,
      class: null,
      cpu_usage: {
        target: 'host.cpu.usage',
        confidence: 0.99,
        type: 'number',
        date_formats: [],
      },
      bytes: {
        target: 'network.bytes',
        confidence: 0.99,
        type: 'number',
        date_formats: [],
      },
      account: {
        user: {
          target: 'user.name',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
        ip: {
          target: 'source.ip',
          type: 'string',
          date_formats: [],
          confidence: 1.0,
        },
      },
      event: {
        target: 'event.action',
        confidence: 0.8,
        type: 'string',
        date_formats: [],
      },
    },
  },
};

export const ecsTestState = {
  ecs: 'teststring',
  exAnswer: 'testanswer',
  finalized: false,
  chunkSize: 30,
  currentPipeline: { test: 'testpipeline' },
  duplicateFields: [],
  missingKeys: [],
  invalidEcsFields: [],
  finalMapping: { test: 'testmapping' },
  sampleChunks: [''],
  results: { test: 'testresults' },
  samplesFormat: { name: SamplesFormatName.Values.json },
  ecsVersion: 'testversion',
  chunkMapping: { test1: 'test1' },
  useFinalMapping: false,
  hasTriedOnce: false,
  currentMapping: { test1: 'test1' },
  lastExecutedChain: 'testchain',
  rawSamples: ['{"test1": "test1"}'],
  prefixedSamples: ['{ "test1": "test1" }'],
  packageName: 'testpackage',
  dataStreamName: 'testDataStream',
  combinedSamples: '{"test1": "test1"}',
  additionalProcessors: [],
};

export const ecsPipelineState: EcsMappingState = {
  lastExecutedChain: 'validateMappings',
  rawSamples: [],
  additionalProcessors: [],
  prefixedSamples: [
    '{"xdfsfs":{"ds":{"ei":0,"event":"cert.create","uid":"efd326fc-dd13-4df8-erre-3102c2d717d3","code":"TC000I","time":"2024-02-24T06:56:50.648137154Z","cluster_name":"teleport.ericbeahan.com","cert_type":"user","identity":{"user":"teleport-admin","roles":["access","editor"],"logins":["root","ubuntu","ec2-user","-teleport-internal-join"],"expires":"2024-02-24T06:56:50.648137154Z","route_to_cluster":"teleport.ericbeahan.com","traits":{"aws_role_arns":null,"azure_identities":null,"db_names":null,"db_roles":null,"db_users":null,"gcp_service_accounts":null,"host_user_gid":[""],"host_user_uid":[""],"kubernetes_groups":null,"kubernetes_users":null,"logins":["root","ubuntu","ec2-user"],"windows_logins":null},"teleport_cluster":"teleport.ericbeahan.com","client_ip":"1.2.3.4","prev_identity_expires":"0001-01-01T00:00:00Z","private_key_policy":"none"}}}}',
    '{"xdfsfs":{"ds":{"ei":0,"event":"session.start","uid":"fff30583-13be-49e8-b159-32952c6ea34f","code":"T2000I","time":"2024-02-23T18:56:57.648137154Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","login":"ec2-user","user_kind":1,"sid":"293fda2d-2266-4d4d-b9d1-bd5ea9dd9fc3","private_key_policy":"none","namespace":"default","server_id":"face0091-2bf1-54er-a16a-f1514b4119f4","server_hostname":"ip-172-31-8-163.us-east-2.compute.internal","server_labels":{"hostname":"ip-172-31-8-163.us-east-2.compute.internal","teleport.internal/resource-id":"dccb2999-9fb8-4169-aded-ec7a1c0a26de"},"addr.remote":"1.2.3.4:50339","proto":"ssh","size":"80:25","initial_command":[""],"session_recording":"node"}}}',
  ],
  combinedSamples:
    '{\n  "xdfsfs": {\n    "ds": {\n      "identity": {\n        "client_ip": "1.2.3.4",\n        "prev_identity_expires": "0001-01-01T00:00:00Z",\n        "private_key_policy": "none"\n      },\n      "user": "teleport-admin",\n      "login": "ec2-user",\n      "user_kind": 1,\n      "sid": "293fda2d-2266-4d4d-b9d1-bd5ea9dd9fc3",\n      "private_key_policy": "none",\n      "namespace": "default",\n      "server_id": "face0091-2bf1-43fd-a16a-f1514b4119f4",\n      "server_hostname": "ip-172-31-8-163.us-east-2.compute.internal",\n      "server_labels": {\n        "hostname": "ip-172-31-8-163.us-east-2.compute.internal",\n        "teleport.internal/resource-id": "dccb2999-9fb8-4169-aded-ec7a1c0a26de"\n      },\n      "addr.remote": "1.2.3.4:50339",\n      "proto": "ssh",\n      "size": "80:25",\n      "initial_command": [\n        ""\n      ],\n      "session_recording": "node"\n    }\n  }\n}',
  sampleChunks: [],
  exAnswer:
    '{\n  "crowdstrike": {\n    "falcon": {\n      "metadata": {\n        "customerIDString": null,\n        "offset": null,\n        "eventType": {\n          "target": "event.code",\n          "confidence": 0.94,\n          "type": "string",\n          "date_formats": []\n        },\n        "eventCreationTime": {\n          "target": "event.created",\n          "confidence": 0.85,\n          "type": "date",\n          "date_formats": [\n            "UNIX"\n          ]\n        },\n        "version": null,\n        "event": {\n          "DeviceId": null,\n          "CustomerId": null,\n          "Ipv": {\n            "target": "network.type",\n            "confidence": 0.99,\n            "type": "string",\n            "date_formats": []\n          }\n        }\n      }\n    }\n  }\n}',
  packageName: 'xdfsfs',
  dataStreamName: 'ds',
  finalized: false,
  currentMapping: {
    xdfsfs: {
      ds: {
        identity: {
          client_ip: {
            target: 'client.ip',
            confidence: 0.95,
            type: 'string',
            date_formats: [],
          },
          prev_identity_expires: {
            target: 'event.end',
            confidence: 0.7,
            type: 'date',
            date_formats: ["yyyy-MM-dd'T'HH:mm:ss'Z'"],
          },
          private_key_policy: null,
        },
        user: {
          target: 'user.name',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        login: {
          target: 'user.id',
          confidence: 0.8,
          type: 'string',
          date_formats: [],
        },
        user_kind: null,
        sid: {
          target: 'event.id',
          confidence: 0.85,
          type: 'string',
          date_formats: [],
        },
        private_key_policy: null,
        namespace: null,
        server_id: {
          target: 'host.id',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        server_hostname: {
          target: 'host.hostname',
          confidence: 0.95,
          type: 'string',
          date_formats: [],
        },
        server_labels: {
          hostname: null,
          'teleport.internal/resource-id': null,
        },
        'addr.remote': {
          target: 'source.address',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        proto: {
          target: 'network.protocol',
          confidence: 0.95,
          type: 'string',
          date_formats: [],
        },
        size: null,
        initial_command: null,
        session_recording: null,
      },
    },
  },
  chunkMapping: {
    xdfsfs: {
      ds: {
        ei: null,
        event: {
          target: 'event.action',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        uid: {
          target: 'event.id',
          confidence: 0.95,
          type: 'string',
          date_formats: [],
        },
        code: {
          target: 'event.code',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        time: {
          target: 'event.created',
          confidence: 0.95,
          type: 'date',
          date_formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'"],
        },
        cluster_name: {
          target: 'cloud.account.name',
          confidence: 0.8,
          type: 'string',
          date_formats: [],
        },
        cert_type: null,
        identity: {
          user: {
            target: 'user.name',
            confidence: 0.95,
            type: 'string',
            date_formats: [],
          },
          roles: {
            target: 'user.roles',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          logins: null,
          expires: {
            target: 'user.changes.name',
            confidence: 0.7,
            type: 'date',
            date_formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'"],
          },
          route_to_cluster: null,
          traits: {
            aws_role_arns: null,
            azure_identities: null,
            db_names: null,
            db_roles: null,
            db_users: null,
            gcp_service_accounts: null,
            host_user_gid: null,
            host_user_uid: null,
            kubernetes_groups: null,
            kubernetes_users: null,
            logins: null,
            windows_logins: null,
          },
          teleport_cluster: null,
          client_ip: {
            target: 'client.ip',
            confidence: 0.95,
            type: 'string',
            date_formats: [],
          },
          prev_identity_expires: {
            target: 'event.end',
            confidence: 0.7,
            type: 'date',
            date_formats: ["yyyy-MM-dd'T'HH:mm:ss'Z'"],
          },
          private_key_policy: null,
        },
        user: {
          target: 'user.name',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        login: {
          target: 'user.id',
          confidence: 0.8,
          type: 'string',
          date_formats: [],
        },
        user_kind: null,
        sid: {
          target: 'event.id',
          confidence: 0.85,
          type: 'string',
          date_formats: [],
        },
        private_key_policy: null,
        namespace: null,
        server_id: {
          target: 'host.id',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        server_hostname: {
          target: 'host.hostname',
          confidence: 0.95,
          type: 'string',
          date_formats: [],
        },
        server_labels: {
          hostname: null,
          'teleport.internal/resource-id': null,
        },
        'addr.remote': {
          target: 'source.address',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        proto: {
          target: 'network.protocol',
          confidence: 0.95,
          type: 'string',
          date_formats: [],
        },
        size: null,
        initial_command: null,
        session_recording: null,
      },
    },
  },
  finalMapping: {
    xdfsfs: {
      ds: {
        ei: null,
        event: {
          target: 'event.action',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        uid: {
          target: 'event.id',
          confidence: 0.95,
          type: 'string',
          date_formats: [],
        },
        code: {
          target: 'event.code',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        '@timestamp': {
          target: '@timestamp',
          confidence: 0.95,
          type: 'date',
          date_formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'"],
        },
        cluster_name: {
          target: 'cloud.account.name',
          confidence: 0.8,
          type: 'string',
          date_formats: [],
        },
        cert_type: null,
        identity: {
          user: {
            target: 'user.name',
            confidence: 0.95,
            type: 'string',
            date_formats: [],
          },
          roles: {
            target: 'user.roles',
            confidence: 0.9,
            type: 'string',
            date_formats: [],
          },
          logins: null,
          expires: {
            target: 'user.changes.name',
            confidence: 0.7,
            type: 'date',
            date_formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'"],
          },
          route_to_cluster: null,
          traits: {
            aws_role_arns: null,
            azure_identities: null,
            db_names: null,
            db_roles: null,
            db_users: null,
            gcp_service_accounts: null,
            host_user_gid: null,
            host_user_uid: null,
            kubernetes_groups: null,
            kubernetes_users: null,
            logins: null,
            windows_logins: null,
          },
          teleport_cluster: null,
          client_ip: {
            target: 'client.ip',
            confidence: 0.95,
            type: 'string',
            date_formats: [],
          },
          prev_identity_expires: {
            target: 'event.end',
            confidence: 0.7,
            type: 'date',
            date_formats: ["yyyy-MM-dd'T'HH:mm:ss'Z'"],
          },
          private_key_policy: null,
        },
        user: {
          target: 'user.name',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        login: {
          target: 'user.id',
          confidence: 0.8,
          type: 'string',
          date_formats: [],
        },
        user_kind: null,
        sid: null,
        private_key_policy: null,
        namespace: null,
        server_id: {
          target: 'host.id',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        server_hostname: {
          target: 'host.hostname',
          confidence: 0.95,
          type: 'string',
          date_formats: [],
        },
        server_labels: {
          hostname: null,
          'teleport.internal/resource-id': null,
        },
        'addr.remote': {
          target: 'source.address',
          confidence: 0.9,
          type: 'string',
          date_formats: [],
        },
        proto: {
          target: 'network.protocol',
          confidence: 0.95,
          type: 'string',
          date_formats: [],
        },
        size: null,
        initial_command: null,
        session_recording: null,
      },
    },
  },
  useFinalMapping: true,
  hasTriedOnce: true,
  currentPipeline: {},
  duplicateFields: [],
  missingKeys: [],
  invalidEcsFields: [],
  results: {},
  samplesFormat: {
    name: 'json',
    json_path: [],
  },
  ecsVersion: '8.11.0',
  ecs: '',
  chunkSize: 0,
};
