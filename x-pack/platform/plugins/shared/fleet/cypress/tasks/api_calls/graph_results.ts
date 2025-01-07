/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ecsResultsForJson = {
  mapping: {
    teleport2: {
      audit: {
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
      },
    },
  },
  pipeline: {
    description: 'Pipeline to process teleport2 audit logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          tag: 'set_ecs_version',
          value: '8.11.0',
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
          target_field: 'teleport2.audit',
        },
      },
      {
        rename: {
          field: 'teleport2.audit.event',
          target_field: 'event.action',
          ignore_missing: true,
        },
      },
      {
        script: {
          description: 'Ensures the date processor does not receive an array value.',
          tag: 'script_convert_array_to_string',
          lang: 'painless',
          source:
            'if (ctx.teleport2?.audit?.time != null &&\n    ctx.teleport2.audit.time instanceof ArrayList){\n    ctx.teleport2.audit.time = ctx.teleport2.audit.time[0];\n}\n',
        },
      },
      {
        date: {
          field: 'teleport2.audit.time',
          target_field: 'event.start',
          formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'", 'ISO8601'],
          tag: 'date_processor_teleport2.audit.time',
          if: 'ctx.teleport2?.audit?.time != null',
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

export const categorizationResultsForJson = {
  docs: [
    {
      ecs: {
        version: '8.11.0',
      },
      teleport2: {
        audit: {
          cert_type: 'user',
          time: '2024-02-24T06:56:50.648137154Z',
          ei: 0,
          identity: {
            expires: '2024-02-24T06:56:50.648137154Z',
            traits: {
              logins: ['root', 'ubuntu', 'ec2-user'],
            },
            private_key_policy: 'none',
            teleport_cluster: 'teleport.com',
            prev_identity_expires: '0001-01-01T00:00:00Z',
            route_to_cluster: 'teleport.com',
            logins: ['root', 'ubuntu', 'ec2-user', '-teleport-internal-join'],
          },
        },
      },
      organization: {
        name: 'teleport.com',
      },
      source: {
        ip: '1.2.3.4',
      },
      event: {
        code: 'TC000I',
        start: '2024-02-24T06:56:50.648Z',
        action: 'cert.create',
        end: '0001-01-01T00:00:00.000Z',
        id: 'efd326fc-dd13-4df8-acef-3102c2d717d3',
        category: ['iam', 'authentication'],
        type: ['creation', 'start'],
      },
      user: {
        name: 'teleport-admin',
        changes: {
          name: '2024-02-24T06:56:50.648Z',
        },
        roles: ['access', 'editor'],
      },
      tags: [
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
      ],
    },
  ],
  pipeline: {
    description: 'Pipeline to process teleport2 audit logs',
    processors: [
      {
        set: {
          field: 'ecs.version',
          tag: 'set_ecs_version',
          value: '8.11.0',
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
          target_field: 'teleport2.audit',
        },
      },
      {
        rename: {
          field: 'teleport2.audit.event',
          target_field: 'event.action',
          ignore_missing: true,
        },
      },
      {
        script: {
          description: 'Ensures the date processor does not receive an array value.',
          tag: 'script_convert_array_to_string',
          lang: 'painless',
          source:
            'if (ctx.teleport2?.audit?.time != null &&\n    ctx.teleport2.audit.time instanceof ArrayList){\n    ctx.teleport2.audit.time = ctx.teleport2.audit.time[0];\n}\n',
        },
      },
      {
        date: {
          field: 'teleport2.audit.time',
          target_field: 'event.start',
          formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'", 'ISO8601'],
          tag: 'date_processor_teleport2.audit.time',
          if: 'ctx.teleport2?.audit?.time != null',
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

export const relatedResultsForJson = {
  docs: [
    {
      ecs: {
        version: '8.11.0',
      },
      related: {
        user: ['teleport-admin'],
        ip: ['1.2.3.4'],
      },
      teleport2: {
        audit: {
          cert_type: 'user',
          time: '2024-02-24T06:56:50.648137154Z',
          ei: 0,
          identity: {
            expires: '2024-02-24T06:56:50.648137154Z',
            traits: {
              logins: ['root', 'ubuntu', 'ec2-user'],
            },
            private_key_policy: 'none',
            teleport_cluster: 'teleport.com',
            prev_identity_expires: '0001-01-01T00:00:00Z',
            route_to_cluster: 'teleport.com',
            logins: ['root', 'ubuntu', 'ec2-user', '-teleport-internal-join'],
          },
        },
      },
      organization: {
        name: 'teleport.com',
      },
      source: {
        ip: '1.2.3.4',
      },
      event: {
        code: 'TC000I',
        start: '2024-02-24T06:56:50.648Z',
        action: 'cert.create',
        end: '0001-01-01T00:00:00.000Z',
        id: 'efd326fc-dd13-4df8-acef-3102c2d717d3',
        category: ['iam', 'authentication'],
        type: ['creation', 'start'],
      },
      user: {
        name: 'teleport-admin',
        changes: {
          name: '2024-02-24T06:56:50.648Z',
        },
        roles: ['access', 'editor'],
      },
      tags: [
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
        '_geoip_database_unavailable_GeoLite2-City.mmdb',
        '_geoip_database_unavailable_GeoLite2-ASN.mmdb',
      ],
    },
  ],
  pipeline: {
    description: 'Pipeline to process teleport2 audit logs',
    processors: [
      {
        set: {
          tag: 'set_ecs_version',
          field: 'ecs.version',
          value: '8.11.0',
        },
      },
      {
        set: {
          tag: 'copy_original_message',
          field: 'originalMessage',
          copy_from: 'message',
        },
      },
      {
        rename: {
          ignore_missing: true,
          if: 'ctx.event?.original == null',
          tag: 'rename_message',
          field: 'originalMessage',
          target_field: 'event.original',
        },
      },
      {
        rename: {
          ignore_missing: true,
          field: 'teleport2.audit.user',
          target_field: 'user.name',
        },
      },
      {
        rename: {
          ignore_missing: true,
          field: 'teleport2.audit.login',
          target_field: 'user.id',
        },
      },
      {
        rename: {
          ignore_missing: true,
          field: 'teleport2.audit.server_hostname',
          target_field: 'destination.domain',
        },
      },
      {
        rename: {
          ignore_missing: true,
          field: 'teleport2.audit.addr.remote',
          target_field: 'source.address',
        },
      },
      {
        rename: {
          ignore_missing: true,
          field: 'teleport2.audit.proto',
          target_field: 'network.protocol',
        },
      },
      {
        script: {
          tag: 'script_drop_null_empty_values',
          description: 'Drops null/empty values recursively.',
          lang: 'painless',
          source:
            'boolean dropEmptyFields(Object object) {\n  if (object == null || object == "") {\n    return true;\n  } else if (object instanceof Map) {\n    ((Map) object).values().removeIf(value -> dropEmptyFields(value));\n    return (((Map) object).size() == 0);\n  } else if (object instanceof List) {\n    ((List) object).removeIf(value -> dropEmptyFields(value));\n    return (((List) object).length == 0);\n  }\n  return false;\n}\ndropEmptyFields(ctx);\n',
        },
      },
      {
        geoip: {
          ignore_missing: true,
          tag: 'geoip_source_ip',
          field: 'source.ip',
          target_field: 'source.geo',
        },
      },
      {
        geoip: {
          ignore_missing: true,
          tag: 'geoip_source_asn',
          database_file: 'GeoLite2-ASN.mmdb',
          field: 'source.ip',
          target_field: 'source.as',
          properties: ['asn', 'organization_name'],
        },
      },
      {
        rename: {
          ignore_missing: true,
          tag: 'rename_source_as_asn',
          field: 'source.as.asn',
          target_field: 'source.as.number',
        },
      },
      {
        rename: {
          ignore_missing: true,
          tag: 'rename_source_as_organization_name',
          field: 'source.as.organization_name',
          target_field: 'source.as.organization.name',
        },
      },
      {
        geoip: {
          ignore_missing: true,
          tag: 'geoip_destination_ip',
          field: 'destination.ip',
          target_field: 'destination.geo',
        },
      },
      {
        geoip: {
          ignore_missing: true,
          tag: 'geoip_destination_asn',
          database_file: 'GeoLite2-ASN.mmdb',
          field: 'destination.ip',
          target_field: 'destination.as',
          properties: ['asn', 'organization_name'],
        },
      },
      {
        rename: {
          ignore_missing: true,
          tag: 'rename_destination_as_asn',
          field: 'destination.as.asn',
          target_field: 'destination.as.number',
        },
      },
      {
        rename: {
          ignore_missing: true,
          tag: 'rename_destination_as_organization_name',
          field: 'destination.as.organization_name',
          target_field: 'destination.as.organization.name',
        },
      },
      {
        append: {
          if: "ctx.event?.action == 'cert.create'",
          field: 'event.category',
          value: ['iam'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          if: "ctx.event?.action == 'cert.create'",
          field: 'event.type',
          value: ['creation'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          if: "ctx.event?.action == 'cert.create'",
          field: 'event.category',
          value: ['authentication'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          if: "ctx.event?.action == 'cert.create'",
          field: 'event.type',
          value: ['start'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          if: "ctx.event?.action == 'session.start'",
          field: 'event.category',
          value: ['session'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          if: "ctx.event?.action == 'session.start'",
          field: 'event.type',
          value: ['start'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          if: "ctx.network?.protocol == 'ssh'",
          field: 'event.category',
          value: ['network'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          if: "ctx.network?.protocol == 'ssh'",
          field: 'event.type',
          value: ['connection', 'start'],
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.ip',
          value: '{{{source.ip}}}',
          if: 'ctx.source?.ip != null',
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.user',
          value: '{{{user.name}}}',
          if: 'ctx.user?.name != null',
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.hosts',
          value: '{{{destination.domain}}}',
          if: 'ctx.destination?.domain != null',
          allow_duplicates: false,
        },
      },
      {
        append: {
          field: 'related.user',
          value: '{{{user.id}}}',
          if: 'ctx.user?.id != null',
          allow_duplicates: false,
        },
      },
      {
        remove: {
          ignore_missing: true,
          tag: 'remove_fields',
          field: ['teleport2.audit.identity.client_ip'],
        },
      },
      {
        remove: {
          ignore_failure: true,
          ignore_missing: true,
          if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
          tag: 'remove_original_event',
          field: 'event.original',
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
