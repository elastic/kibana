/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Pipeline, Docs, SamplesFormat } from '../../../../../common';
import type { Actions, State } from '../state';
import type { AIConnector } from '../types';

const result: { pipeline: Pipeline; docs: Docs; samplesFormat: SamplesFormat } = {
  pipeline: {
    description: 'Pipeline to process my_integration my_data_stream_title logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          tag: 'set_ecs_version',
          value: '8.11.0',
        },
      },
      {
        rename: {
          field: 'message',
          target_field: 'event.original',
          tag: 'rename_message',
          ignore_missing: true,
          if: 'ctx.event?.original == null',
        },
      },
      {
        remove: {
          field: 'message',
          ignore_missing: true,
          tag: 'remove_message',
          if: 'ctx.event?.original != null',
        },
      },
      {
        json: {
          field: 'event.original',
          tag: 'json_original',
          target_field: 'my_integration.my_data_stream_title',
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.event',
          target_field: 'event.action',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.uid',
          target_field: 'event.id',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.code',
          target_field: 'event.code',
          ignore_missing: true,
        },
      },
      {
        date: {
          field: 'my_integration.my_data_stream_title.time',
          target_field: '@timestamp',
          formats: ['ISO8601'],
          if: 'ctx.my_integration?.my_data_stream_title?.time != null',
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.user',
          target_field: 'user.name',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.user_agent',
          target_field: 'user_agent.original',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.addr.remote',
          target_field: 'source.address',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.server_hostname',
          target_field: 'destination.domain',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'my_integration.my_data_stream_title.proto',
          target_field: 'network.transport',
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
        append: {
          field: 'event.type',
          value: ['start'],
          allow_duplicates: false,
          if: "ctx.event?.action == 'user.login'",
        },
      },
      {
        append: {
          field: 'event.category',
          value: ['authentication'],
          allow_duplicates: false,
          if: "ctx.event?.action == 'user.login'",
        },
      },
      {
        append: {
          field: 'event.type',
          value: ['start'],
          allow_duplicates: false,
          if: "ctx.event?.action == 'session.start'",
        },
      },
      {
        append: {
          field: 'event.category',
          value: ['session'],
          allow_duplicates: false,
          if: "ctx.event?.action == 'session.start'",
        },
      },
      {
        append: {
          field: 'event.type',
          value: ['info'],
          allow_duplicates: false,
          if: 'ctx.my_integration?.my_data_stream_title?.mfa_device != null',
        },
      },
      {
        append: {
          field: 'event.category',
          value: ['authentication'],
          allow_duplicates: false,
          if: 'ctx.my_integration?.my_data_stream_title?.mfa_device != null',
        },
      },
      {
        append: {
          field: 'related.ip',
          value: ['{{{my_integration.my_data_stream_title.addr.remote}}}'],
          if: 'ctx?.my_integration?.my_data_stream_title?.addr?.remote != null',
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.user',
          value: ['{{{user.name}}}'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.hosts',
          value: ['{{{destination.domain}}}'],
          if: 'ctx?.destination?.domain != null',
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.hosts',
          value: ['{{{my_integration.my_data_stream_title.server_labels.hostname}}}'],
          if: 'ctx?.my_integration?.my_data_stream_title?.server_labels?.hostname != null',
          allow_duplicates: false,
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
  docs: [
    {
      '@timestamp': '2024-02-23T18:56:50.628Z',
      ecs: {
        version: '8.11.0',
      },
      my_integration: {
        my_data_stream_title: {
          cluster_name: 'teleport.ericbeahan.com',
          'addr.remote': '136.61.214.196:50332',
          ei: 0,
          method: 'local',
          required_private_key_policy: 'none',
          success: true,
          time: '2024-02-23T18:56:50.628Z',
          mfa_device: {
            mfa_device_type: 'TOTP',
            mfa_device_uuid: 'd07bf388-af49-4ec2-b8a4-c8a9e785b70b',
            mfa_device_name: 'otp-device',
          },
        },
      },
      related: {
        user: ['teleport-admin'],
      },
      event: {
        action: 'user.login',
        code: 'T1000I',
        id: 'b675d102-fc25-4f7a-bf5d-96468cc176ea',
        type: ['start', 'info'],
        category: ['authentication'],
      },
      user: {
        name: 'teleport-admin',
      },
      user_agent: {
        original:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      },
      tags: [
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
      ],
    },
    {
      '@timestamp': '2024-02-23T18:56:57.199Z',
      ecs: {
        version: '8.11.0',
      },
      my_integration: {
        my_data_stream_title: {
          cluster_name: 'teleport.ericbeahan.com',
          'addr.remote': '136.61.214.196:50339',
          ei: 0,
          private_key_policy: 'none',
          login: 'ec2-user',
          server_id: 'face0091-2bf1-43fd-a16a-f1514b4119f4',
          sid: '293fda2d-2266-4d4d-b9d1-bd5ea9dd9fc3',
          user_kind: 1,
          server_labels: {
            'teleport.internal/resource-id': 'dccb2999-9fb8-4169-aded-ec7a1c0a26de',
            hostname: 'ip-172-31-8-163.us-east-2.compute.internal',
          },
          size: '80:25',
          namespace: 'default',
          session_recording: 'node',
          time: '2024-02-23T18:56:57.199Z',
        },
      },
      related: {
        user: ['teleport-admin'],
        hosts: ['ip-172-31-8-163.us-east-2.compute.internal'],
      },
      destination: {
        domain: 'ip-172-31-8-163.us-east-2.compute.internal',
      },
      event: {
        action: 'session.start',
        code: 'T2000I',
        id: 'fff30583-13be-49e8-b159-32952c6ea34f',
        type: ['start'],
        category: ['session'],
      },
      user: {
        name: 'teleport-admin',
      },
      network: {
        transport: 'ssh',
      },
      tags: [
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
      ],
    },
  ],
  samplesFormat: { name: 'json' },
};

const rawSamples = [
  '{"ei":0,"event":"user.login","uid":"b675d102-fc25-4f7a-bf5d-96468cc176ea","code":"T1000I","time":"2024-02-23T18:56:50.628Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","required_private_key_policy":"none","success":true,"method":"local","mfa_device.mfa_device_name":"otp-device","mfa_device.mfa_device_uuid":"d07bf388-af49-4ec2-b8a4-c8a9e785b70b","mfa_device.mfa_device_type":"TOTP","user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36","addr.remote":"136.61.214.196:50332"}',
  '{"ei":0,"event":"cert.create","uid":"efd326fc-dd13-4df8-acef-3102c2d717d3","code":"TC000I","time":"2024-02-23T18:56:50.653Z","cluster_name":"teleport.ericbeahan.com","cert_type":"user","identity.user":"teleport-admin","identity.roles":["access","editor"],"identity.logins":["root","ubuntu","ec2-user","-teleport-internal-join"],"identity.expires":"2024-02-24T06:56:50.648137154Z","identity.route_to_cluster":"teleport.ericbeahan.com","identity.traits.aws_role_arns":null,"identity.traits.azure_identities":null,"identity.traits.db_names":null,"identity.traits.db_roles":null,"identity.traits.db_users":null,"identity.traits.gcp_service_accounts":null,"identity.traits.host_user_gid":[""],"identity.traits.host_user_uid":[""],"identity.traits.kubernetes_groups":null,"identity.traits.kubernetes_users":null,"identity.traits.logins":["root","ubuntu","ec2-user"],"identity.traits.windows_logins":null,"identity.teleport_cluster":"teleport.ericbeahan.com","identity.client_ip":"136.61.214.196","identity.prev_identity_expires":"0001-01-01T00:00:00Z","identity.private_key_policy":"none"}',
  '{"ei":0,"event":"session.start","uid":"fff30583-13be-49e8-b159-32952c6ea34f","code":"T2000I","time":"2024-02-23T18:56:57.199Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","login":"ec2-user","user_kind":1,"sid":"293fda2d-2266-4d4d-b9d1-bd5ea9dd9fc3","private_key_policy":"none","namespace":"default","server_id":"face0091-2bf1-43fd-a16a-f1514b4119f4","server_hostname":"ip-172-31-8-163.us-east-2.compute.internal","server_labels.hostname":"ip-172-31-8-163.us-east-2.compute.internal","server_labels.teleport.internal/resource-id":"dccb2999-9fb8-4169-aded-ec7a1c0a26de","addr.remote":"136.61.214.196:50339","proto":"ssh","size":"80:25","initial_command":[""],"session_recording":"node"}',
];
const logo =
  'PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzMyNjlfMjExOTMpIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMC41IDExLjk5OTdMNC40MDQgMS42ODQyMUMzLjM4Nzc1IC0wLjAzNzA0MDIgMC43NSAwLjY4NDQ2IDAuNzUgMi42ODMyMVYyMS4zMTYyQzAuNzUgMjMuMzE1IDMuMzg3NzUgMjQuMDM2NSA0LjQwNCAyMi4zMTUyTDEwLjUgMTEuOTk5N1oiIGZpbGw9IiNGMDRFOTgiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMy4xMTMzIDEyTDEyLjQzNzYgMTMuMTQ0NUw2LjM0MTU2IDIzLjQ2QzYuMjI2ODEgMjMuNjUzNSA2LjA5NzA2IDIzLjgzMDUgNS45NTgzMSAyNEgxMi44NDAzQzE0LjY1MDggMjQgMTYuMzMzMSAyMy4wNjc3IDE3LjI5MjMgMjEuNTMyNUwyMy4yNTAzIDEySDEzLjExMzNaIiBmaWxsPSIjRkE3NDRFIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTcuMjkyNCAyLjQ2NzVDMTYuMzMzMiAwLjkzMjI1IDE0LjY1MDkgMCAxMi44Mzk3IDBINS45NTg0NEM2LjA5NjQ0IDAuMTY5NSA2LjIyNjk0IDAuMzQ2NSA2LjM0MDk0IDAuNTRMMTIuNDM2OSAxMC44NTU1TDEzLjExMzQgMTJIMjMuMjQ5N0wxNy4yOTI0IDIuNDY3NVoiIGZpbGw9IiMzNDM3NDEiLz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMF8zMjY5XzIxMTkzIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJ3aGl0ZSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=';

export const mockState: State = {
  step: 4,
  connector: {
    id: 'claudeV3OpusUsWest2',
    name: 'Claude 3 Opus US-WEST-2',
    actionTypeId: '.bedrock',
    config: {
      apiUrl: 'https://bedrock-runtime.us-west-2.amazonaws.com',
      defaultModel: 'anthropic.claude-3-opus-20240229-v1:0',
    },
  } as AIConnector,
  integrationSettings: {
    title: 'Mocked Integration title',
    name: 'mocked_integration',
    logo,
    description: 'Mocked Integration description',
    dataStreamTitle: 'Mocked Data Stream Title',
    dataStreamName: 'mocked_datastream_name',
    dataStreamDescription: 'Mocked Data Stream Description',
    inputTypes: ['filestream'],
    logSamples: rawSamples,
  },
  isGenerating: false,
  result,
  showCelCreateFlyout: false,
  isFlyoutGenerating: false,
  celInputResult: {
    url: 'https://sample.com',
    program: 'line1\nline2',
    authType: 'basic',
    stateSettings: { setting1: 100, setting2: '' },
    redactVars: ['setting2'],
    configFields: { setting1: {}, setting2: {} },
    needsAuthConfigBlock: false,
  },
};

export const mockActions: Actions = {
  setStep: jest.fn(),
  setConnector: jest.fn(),
  setIntegrationSettings: jest.fn(),
  setIsGenerating: jest.fn(),
  setResult: jest.fn(),
  setCelInputResult: jest.fn(),
  setShowCelCreateFlyout: jest.fn(),
  setIsFlyoutGenerating: jest.fn(),
  completeStep: jest.fn(),
};
