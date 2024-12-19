/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Oas from 'oas';
import { reduceSpecComponents } from './oas';

describe('oas util', () => {
  const testSpec: Oas = new Oas({
    openapi: '3.0.1',
    info: {
      title: 'ESET Connect - Automation',
      description:
        '<h3>ESET Connect help:</h3><a href=https://help.eset.com/eset_connect/en-US/>https://help.eset.com/eset_connect/en-US/</a><h4>Task examples:</h4><a href=https://help.eset.com/eset_connect/en-US/eset-protect-cloud-api.html#s-task-examples>https://help.eset.com/eset_connect/en-US/eset-protect-cloud-api.html#s-task-examples</a>',
      version: '',
    },
    servers: [
      {
        url: 'https://eu.automation.eset.systems/',
      },
    ],
    tags: [
      {
        name: 'DeviceTasks',
      },
    ],
    paths: {
      '/v1/device_tasks': {
        get: {
          tags: ['DeviceTasks'],
          summary: 'List all device tasks matching criteria.',
          operationId: 'DeviceTasks_ListTasks',
          parameters: [
            {
              name: 'pageSize',
              in: 'query',
              description:
                'Limit for pagination purposes.\n\n> **info:**\n>For more information, refer to [Paginating Requests in APIs](https://medium.com/@ignaciochiazzo/paginating-requests-in-apis-d4883d4c1c4c)\n\nor https://cloud.google.com/apis/design/design_patterns#list_pagination',
              required: false,
              style: 'form',
              explode: true,
              schema: {
                type: 'integer',
                format: 'int64',
              },
            },
            {
              name: 'pageToken',
              in: 'query',
              description:
                'Page token of current page.\n\n> **info:**\n>For more information, refer to [Paginating Requests in APIs](https://medium.com/@ignaciochiazzo/paginating-requests-in-apis-d4883d4c1c4c)\n\nor https://cloud.google.com/apis/design/design_patterns#list_pagination',
              required: false,
              style: 'form',
              explode: true,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'A successful response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/v1ListTasksResponse',
                  },
                },
              },
            },
            default: {
              description: 'An unexpected error response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/rpcStatus',
                  },
                },
              },
            },
            '202': {
              description: 'Response took too long and the request was cached.',
              headers: {
                'response-id': {
                  description: 'Unique ID of a pending request. Used to retrieve cached result.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {},
            },
          },
          security: [
            {
              Bearer: [],
            },
          ],
        },
        post: {
          tags: ['DeviceTasks'],
          summary: 'Creates [device task].',
          description:
            'Created task requires to have at least one trigger set. Otherwise the call fails.\n\n```migration from EP/ESMC/ERA:\n`CreateTask()` uses deduplication algorithm to prevent from creating tasks with the same configuration but different trigger.\n```',
          operationId: 'DeviceTasks_CreateTask',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/v1CreateTaskRequest',
                },
              },
            },
            required: true,
          },
          responses: {
            '200': {
              description: 'A successful response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/v1CreateTaskResponse',
                  },
                },
              },
            },
            default: {
              description: 'An unexpected error response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/rpcStatus',
                  },
                },
              },
            },
            '202': {
              description: 'Response took too long and the request was cached.',
              headers: {
                'response-id': {
                  description: 'Unique ID of a pending request. Used to retrieve cached result.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {},
            },
          },
          security: [
            {
              Bearer: [],
            },
          ],
        },
      },
      '/v1/device_tasks/{taskUuid}': {
        get: {
          tags: ['DeviceTasks'],
          summary: 'Get task entity.',
          description:
            'For complete history please call `ListTaskRuns()`.\n\n```migration from EP/ESMC/ERA:\nGetTask maps to getting details of trigger.\n```',
          operationId: 'DeviceTasks_GetTask',
          parameters: [
            {
              name: 'taskUuid',
              in: 'path',
              description: 'Task reference.\n\ntype: DeviceTask',
              required: true,
              style: 'simple',
              explode: false,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'A successful response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/v1GetTaskResponse',
                  },
                },
              },
            },
            default: {
              description: 'An unexpected error response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/rpcStatus',
                  },
                },
              },
            },
            '202': {
              description: 'Response took too long and the request was cached.',
              headers: {
                'response-id': {
                  description: 'Unique ID of a pending request. Used to retrieve cached result.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {},
            },
          },
          security: [
            {
              Bearer: [],
            },
          ],
        },
        delete: {
          tags: ['DeviceTasks'],
          summary: 'Delete specified task.',
          description: '```migration from EP/ESMC/ERA:\nMaps to deleting trigger.\n```',
          operationId: 'DeviceTasks_DeleteTask',
          parameters: [
            {
              name: 'taskUuid',
              in: 'path',
              description: 'Reference to deleted task.\n\ntype: DeviceTask',
              required: true,
              style: 'simple',
              explode: false,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'A successful response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/v1DeleteTaskResponse',
                  },
                },
              },
            },
            default: {
              description: 'An unexpected error response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/rpcStatus',
                  },
                },
              },
            },
            '202': {
              description: 'Response took too long and the request was cached.',
              headers: {
                'response-id': {
                  description: 'Unique ID of a pending request. Used to retrieve cached result.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {},
            },
          },
          security: [
            {
              Bearer: [],
            },
          ],
        },
      },
      '/v1/device_tasks/{taskUuid}/runs': {
        get: {
          tags: ['DeviceTasks'],
          summary: 'List task history - all the runs of the task.',
          description:
            'For sake of forensics, the [task run]s are listed collectively, not as children of their parent task. Information about task runs might easily survive their parent task.\n\n```migration from EP/ESMC/ERA:\nTo list what is called `Executions` set `only_latest` flag to `true`.\n```\n\n> **info:**\n> Modeled based on https://google.aip.dev/152#executions-and-results with ESET specific vocabulary.',
          operationId: 'DeviceTasks_ListTaskRuns',
          parameters: [
            {
              name: 'taskUuid',
              in: 'path',
              description: 'Include only runs of specific task. Mandatory.\n\ntype: DeviceTask',
              required: true,
              style: 'simple',
              explode: false,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'deviceUuid',
              in: 'query',
              description:
                'Only include runs on specific device (if filled).\n\ntype: device_management/v1/Device',
              required: false,
              style: 'form',
              explode: true,
              schema: {
                type: 'string',
              },
            },
            {
              name: 'listOnlyLastRuns',
              in: 'query',
              description: 'If true, the result will only contain the latest runs per device.',
              required: false,
              style: 'form',
              explode: true,
              schema: {
                type: 'boolean',
              },
            },
            {
              name: 'pageSize',
              in: 'query',
              description:
                'Limit for pagination purposes.\n\n> **info:**\n> For more information, refer to [Paginating Requests in APIs](https://medium.com/@ignaciochiazzo/paginating-requests-in-apis-d4883d4c1c4c)    \nor https://cloud.google.com/apis/design/design_patterns#list_pagination',
              required: false,
              style: 'form',
              explode: true,
              schema: {
                type: 'integer',
                format: 'int64',
              },
            },
            {
              name: 'pageToken',
              in: 'query',
              description:
                'Page token of current page.\n\n> **info:**\n> For more information, refer to [Paginating Requests in APIs](https://medium.com/@ignaciochiazzo/paginating-requests-in-apis-d4883d4c1c4c)\nor https://cloud.google.com/apis/design/design_patterns#list_pagination',
              required: false,
              style: 'form',
              explode: true,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'A successful response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/v1ListTaskRunsResponse',
                  },
                },
              },
            },
            default: {
              description: 'An unexpected error response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/rpcStatus',
                  },
                },
              },
            },
            '202': {
              description: 'Response took too long and the request was cached.',
              headers: {
                'response-id': {
                  description: 'Unique ID of a pending request. Used to retrieve cached result.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {},
            },
          },
          security: [
            {
              Bearer: [],
            },
          ],
        },
      },
      '/v1/device_tasks/{taskUuid}:updateTaskTargets': {
        post: {
          tags: ['DeviceTasks'],
          summary: 'Update task targets.',
          operationId: 'DeviceTasks_UpdateTaskTargets',
          parameters: [
            {
              name: 'taskUuid',
              in: 'path',
              description: 'Descriptor of the task to update\n\ntype: DeviceTask',
              required: true,
              style: 'simple',
              explode: false,
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DeviceTasksUpdateTaskTargetsBody',
                },
              },
            },
            required: true,
          },
          responses: {
            '200': {
              description: 'A successful response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/v1UpdateTaskTargetsResponse',
                  },
                },
              },
            },
            default: {
              description: 'An unexpected error response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/rpcStatus',
                  },
                },
              },
            },
            '202': {
              description: 'Response took too long and the request was cached.',
              headers: {
                'response-id': {
                  description: 'Unique ID of a pending request. Used to retrieve cached result.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {},
            },
          },
          security: [
            {
              Bearer: [],
            },
          ],
        },
      },
      '/v1/device_tasks/{taskUuid}:updateTaskTriggers': {
        post: {
          tags: ['DeviceTasks'],
          summary: 'Update list of task triggers.',
          operationId: 'DeviceTasks_UpdateTaskTriggers',
          parameters: [
            {
              name: 'taskUuid',
              in: 'path',
              description: 'Descriptor of the task to update\n\ntype: DeviceTask',
              required: true,
              style: 'simple',
              explode: false,
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/DeviceTasksUpdateTaskTriggersBody',
                },
              },
            },
            required: true,
          },
          responses: {
            '200': {
              description: 'A successful response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/v1UpdateTaskTriggersResponse',
                  },
                },
              },
            },
            default: {
              description: 'An unexpected error response.',
              headers: {
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/rpcStatus',
                  },
                },
              },
            },
            '202': {
              description: 'Response took too long and the request was cached.',
              headers: {
                'response-id': {
                  description: 'Unique ID of a pending request. Used to retrieve cached result.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
                'request-id': {
                  description: 'Unique ID of the request.',
                  style: 'simple',
                  explode: false,
                  schema: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              content: {},
            },
          },
          security: [
            {
              Bearer: [],
            },
          ],
        },
      },
    },
    components: {
      schemas: {
        DeviceTasksDuplicateTaskBody: {
          type: 'object',
          properties: {
            manualTriggerExpireTime: {
              type: 'string',
              description:
                'If `reduce_triggers_to_manual` == `true`, this parameter sets time of manual trigger expiration.\n\nIt is ignored otherwise.\n\nIf left empty, default expiration is used (ca 30 days)',
              format: 'date-time',
            },
            reduceTargetsToFailed: {
              type: 'boolean',
              description:
                'If `true`, the task duplicate will only contain targets where original task failed to run.',
            },
            reduceTriggersToManual: {
              type: 'boolean',
              description:
                'If true, all triggers of duplicated task would be reduced to one Manual Trigger with `create_time` == now.',
            },
          },
        },
        DeviceTasksUpdateTaskTargetsBody: {
          type: 'object',
          properties: {
            targets: {
              $ref: '#/components/schemas/v1DeviceTaskTargets',
            },
          },
        },
        DeviceTasksUpdateTaskTriggersBody: {
          type: 'object',
          properties: {
            triggers: {
              type: 'array',
              description:
                'List of the triggers that replace current triggers.\n\nCannot be empty.',
              items: {
                $ref: '#/components/schemas/v1Trigger',
              },
            },
          },
        },
        protobufAny: {
          type: 'object',
          properties: {
            '@type': {
              type: 'string',
              description:
                'A URL/resource name that uniquely identifies the type of the serialized\nprotocol buffer message. This string must contain at least\none "/" character. The last segment of the URL\'s path must represent\nthe fully qualified name of the type (as in\n`path/google.protobuf.Duration`). The name should be in a canonical form\n(e.g., leading "." is not accepted).\n\nIn practice, teams usually precompile into the binary all types that they\nexpect it to use in the context of Any. However, for URLs which use the\nscheme `http`, `https`, or no scheme, one can optionally set up a type\nserver that maps type URLs to message definitions as follows:\n\n* If no scheme is provided, `https` is assumed.\n* An HTTP GET on the URL must yield a [google.protobuf.Type][]\n  value in binary format, or produce an error.\n* Applications are allowed to cache lookup results based on the\n  URL, or have them precompiled into a binary to avoid any\n  lookup. Therefore, binary compatibility needs to be preserved\n  on changes to types. (Use versioned type names to manage\n  breaking changes.)\n\nNote: this functionality is not currently available in the official\nprotobuf release, and it is not used for type URLs beginning with\ntype.googleapis.com. As of May 2023, there are no widely used type server\nimplementations and no plans to implement one.\n\nSchemes other than `http`, `https` (or the empty scheme) might be\nused with implementation specific semantics.',
            },
          },
          additionalProperties: {
            type: 'object',
          },
          description:
            '`Any` contains an arbitrary serialized protocol buffer message along with a\nURL that describes the type of the serialized message.\n\nProtobuf library provides support to pack/unpack Any values in the form\nof utility functions or additional generated methods of the Any type.\n\nExample 1: Pack and unpack a message in C++.\n\n    Foo foo = ...;\n    Any any;\n    any.PackFrom(foo);\n    ...\n    if (any.UnpackTo(&foo)) {\n      ...\n    }\n\nExample 2: Pack and unpack a message in Java.\n\n    Foo foo = ...;\n    Any any = Any.pack(foo);\n    ...\n    if (any.is(Foo.class)) {\n      foo = any.unpack(Foo.class);\n    }\n    // or ...\n    if (any.isSameTypeAs(Foo.getDefaultInstance())) {\n      foo = any.unpack(Foo.getDefaultInstance());\n    }\n\n Example 3: Pack and unpack a message in Python.\n\n    foo = Foo(...)\n    any = Any()\n    any.Pack(foo)\n    ...\n    if any.Is(Foo.DESCRIPTOR):\n      any.Unpack(foo)\n      ...\n\n Example 4: Pack and unpack a message in Go\n\n     foo := &pb.Foo{...}\n     any, err := anypb.New(foo)\n     if err != nil {\n       ...\n     }\n     ...\n     foo := &pb.Foo{}\n     if err := any.UnmarshalTo(foo); err != nil {\n       ...\n     }\n\nThe pack methods provided by protobuf library will by default use\n\'type.googleapis.com/full.type.name\' as the type URL and the unpack\nmethods only use the fully qualified type name after the last \'/\'\nin the type URL, for example "foo.bar.com/x/y.z" will yield type\nname "y.z".\n\nJSON\n====\nThe JSON representation of an `Any` value uses the regular\nrepresentation of the deserialized, embedded message, with an\nadditional field `@type` which contains the type URL. Example:\n\n    package google.profile;\n    message Person {\n      string first_name = 1;\n      string last_name = 2;\n    }\n\n    {\n      "@type": "type.googleapis.com/google.profile.Person",\n      "firstName": <string>,\n      "lastName": <string>\n    }\n\nIf the embedded message type is well-known and has a custom JSON\nrepresentation, that representation will be embedded adding a field\n`value` which holds the custom JSON in addition to the `@type`\nfield. Example (for message [google.protobuf.Duration][]):\n\n    {\n      "@type": "type.googleapis.com/google.protobuf.Duration",\n      "value": "1.212s"\n    }',
        },
        rpcStatus: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              format: 'int32',
            },
            message: {
              type: 'string',
            },
            details: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/protobufAny',
              },
            },
          },
        },
        v1Action: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Name of the function to execute.\n\nGRPC/ERPC function names in form of package.ServiceName/RpcName\n\nare for example:\n- `eset.dotnod.scan_management.v1.ScanManager/CreateScan`\n- `eset.dotnod.power_management.v1.PowerManager/RegisterAction`\n- `eset.dotnod.network_access_protection.v1.NetworkAccessProtection/StartNetworkIsolation`\n\nActions outside .NOD are available as documented at [ESET PROTECT Cloud help](https://help.eset.com/protect_cloud/en-US/eset_connect.html).\n\n> **info:**\n> For more information about GRPC wire, refer to https://wiki.wireshark.org/gRPC.md',
            },
            params: {
              $ref: '#/components/schemas/protobufAny',
            },
          },
          description: 'Descriptor of the call to make.',
        },
        v1CreateTaskRequest: {
          type: 'object',
          properties: {
            task: {
              $ref: '#/components/schemas/v1DeviceTask',
            },
          },
        },
        v1CreateTaskResponse: {
          type: 'object',
          properties: {
            task: {
              $ref: '#/components/schemas/v1DeviceTask',
            },
          },
        },
        v1DeleteTaskResponse: {
          title: 'empty',
          type: 'object',
        },
        v1DeviceTask: {
          type: 'object',
          properties: {
            action: {
              $ref: '#/components/schemas/v1Action',
            },
            description: {
              type: 'string',
              description: "User's description. Free text.",
            },
            displayName: {
              type: 'string',
              description: 'User friendly name of the task.',
            },
            targets: {
              $ref: '#/components/schemas/v1DeviceTaskTargets',
            },
            triggers: {
              type: 'array',
              description:
                'Specifies *when* to run. What causes task to execute.\n\nCannot be empty.\n\n> **warning:**\n> Migration from EP: ASAP tasks are now `manually triggered tasks`.',
              items: {
                $ref: '#/components/schemas/v1Trigger',
              },
            },
            uuid: {
              type: 'string',
              description:
                'Universally Unique Identifier\nReferences use this identifier so it must be filled in all the cases except resource creation.\n\nCompliant with [RFC 4122: A Universally Unique IDentifier (UUID) URN Namespace](https://tools.ietf.org/html/rfc4122)\n\nFormatted according to template xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx, as explained on [wikipedia](https://en.wikipedia.org/wiki/Universally_unique_identifier#Format).\n\nFor example: "123e4567-e89b-12d3-a456-426614174000"',
            },
            versionId: {
              type: 'string',
              description:
                'Identifier of entity version.\n\n[Version id] determines whether one version is more recent than another. More recent versions have higher numbers.\n\n> **info:**\n> Similar concepts are \n- change sequence number (CSN)\n- revision\n> Developed from VersionCode in Android application manifests: https://developer.android.com/studio/publish/versioning#appversioning',
              format: 'uint64',
            },
          },
          description:
            'Describes device task - a task to be executed on device where some endpoint protection platform runs. It can also be executed indirectly if the actual device uses some device hub (e.g. IoT scenarios).\n\nDevice tasks are abstract containers for scheduled `actions`. If the scheduling information absents, actions are scheduled for ASAP execution.\n\nEvery execution of [device task] instantiates `DeviceTaskExecution`. Device tasks can be scheduled to execute repeatedly, what create many `DeviceTaskExecution` entities.\n\n```migration from EP/ESMC/ERA:\n`DeviceTask` maps to the concept of `Trigger` with `Targets`\n```',
        },
        v1DeviceTaskRun: {
          type: 'object',
          properties: {
            deviceUuid: {
              type: 'string',
              description:
                'Device where task is executed. For tasks assigned to device group there can be multiple task runs from each member of the group.\n\ntype: device_management.v1.Device',
            },
            endTime: {
              type: 'string',
              description: 'Timestamp of run end.\n\nMeaningful for finished and failed task runs.',
              format: 'date-time',
            },
            result: {
              $ref: '#/components/schemas/protobufAny',
            },
            startTime: {
              type: 'string',
              description: 'Timestamp of run start.',
              format: 'date-time',
            },
            status: {
              $ref: '#/components/schemas/v1TaskRunStatus',
            },
            taskUuid: {
              title: '[Device task] reference',
              type: 'string',
              description: 'type: DeviceTask',
            },
            uuid: {
              type: 'string',
              description:
                'Universally Unique Identifier\nReferences use this identifier so it must be filled in all the cases except resource creation.\n\nCompliant with [RFC 4122: A Universally Unique IDentifier (UUID) URN Namespace](https://tools.ietf.org/html/rfc4122)\n\nFormatted according to template xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx, as explained on [wikipedia](https://en.wikipedia.org/wiki/Universally_unique_identifier#Format).\n\nFor example: "123e4567-e89b-12d3-a456-426614174000"',
            },
          },
          description:
            'One run (an execution) of the [device task] on some device.\n\n[Task run] inherits all of its properties from the corresponding [device task].\n\nAdditional documentation about task run results can be found at [ESET PROTECT Cloud help](https://help.eset.com/protect_cloud/en-US/eset_connect.html).\n\n```migration from EP/ESMC/ERA:\n`TaskRun` maps to the concept of `Execution`\n```\n\n> **info:**\n> Identity of the [task run] is kept for one task + device combination + start_time combination.',
        },
        v1DeviceTaskTargets: {
          type: 'object',
          properties: {
            deviceGroupsUuids: {
              type: 'array',
              description:
                'Task can be assigned to groups of devices.\n\ntype: device_management.v1.DeviceGroup',
              items: {
                type: 'string',
              },
            },
            devicesUuids: {
              type: 'array',
              description:
                'Task can be assigned to individual devices, for example if task run failed on these devices.\n\ntype: device_management.v1.Device',
              items: {
                type: 'string',
              },
            },
          },
          description: 'Specifies *where* the task should run.',
        },
        v1DuplicateTaskResponse: {
          type: 'object',
          properties: {
            task: {
              $ref: '#/components/schemas/v1DeviceTask',
            },
          },
        },
        v1GetTaskResponse: {
          type: 'object',
          properties: {
            task: {
              $ref: '#/components/schemas/v1DeviceTask',
            },
          },
        },
        v1ListTaskRunsResponse: {
          type: 'object',
          properties: {
            taskRuns: {
              type: 'array',
              description: 'List of [task run]s matching criteria from the request.',
              items: {
                $ref: '#/components/schemas/v1DeviceTaskRun',
              },
            },
            nextPageToken: {
              type: 'string',
              description:
                'Page token of next page.\n\n> **info:**\n>For more information, refer to [Paginating Requests in APIs](https://medium.com/@ignaciochiazzo/paginating-requests-in-apis-d4883d4c1c4c)\nor https://cloud.google.com/apis/design/design_patterns#list_pagination',
            },
          },
        },
        v1ListTasksResponse: {
          type: 'object',
          properties: {
            tasks: {
              title: 'List of [device task]s',
              type: 'array',
              items: {
                $ref: '#/components/schemas/v1DeviceTask',
              },
            },
            nextPageToken: {
              type: 'string',
              description:
                'Page token of next page.\n\n> **info:**\n>For more information, refer to [Paginating Requests in APIs](https://medium.com/@ignaciochiazzo/paginating-requests-in-apis-d4883d4c1c4c)\nor https://cloud.google.com/apis/design/design_patterns#list_pagination',
            },
          },
        },
        v1ManualTrigger: {
          type: 'object',
          properties: {
            createTime: {
              type: 'string',
              description:
                'When the manual trigger has been created. Task can only be triggered after this time.\n\nRead-only.',
              format: 'date-time',
            },
            expireTime: {
              type: 'string',
              description:
                'Task is not triggered after this time. \n\nThis is useful for task to not be triggered on stale targets (e.g. those turned on after long time of vacation).',
              format: 'date-time',
            },
          },
          description:
            'For manually triggered tasks this trigger causes immediate execution in `as soon as possible` fashion.\n\n> **info:**\n> Examples:\n- https://tray.io/documentation/connectors/triggers/manual-trigger/\n- https://www.coretechnologies.com/blog/windows-services/trigger-start/\n- https://www.nocrm.io/help/manual-trigger-101',
        },
        v1TaskRunStatus: {
          title: 'Possible TaskRun states',
          type: 'string',
          description:
            '- TASK_RUN_STATUS_UNSPECIFIED: fallback\n - TASK_RUN_STATUS_QUEUED: Task run has been processed but it is not yet running on target.\n\n```migration from EP/ESMC/ERA:\nMaps to `STARTING`.\n```\n - TASK_RUN_STATUS_RUNNING: Task is being executed on the target.\n - TASK_RUN_STATUS_FINISHED: Task execution finished successfully.\n - TASK_RUN_STATUS_FAILED: Task execution failed.',
          default: 'TASK_RUN_STATUS_UNSPECIFIED',
          enum: [
            'TASK_RUN_STATUS_UNSPECIFIED',
            'TASK_RUN_STATUS_QUEUED',
            'TASK_RUN_STATUS_RUNNING',
            'TASK_RUN_STATUS_FINISHED',
            'TASK_RUN_STATUS_FAILED',
          ],
        },
        v1Trigger: {
          type: 'object',
          properties: {
            manual: {
              $ref: '#/components/schemas/v1ManualTrigger',
            },
          },
          description: 'Encodes information about when to run task.',
        },
        v1UpdateTaskTargetsResponse: {
          title: 'empty',
          type: 'object',
        },
        v1UpdateTaskTriggersResponse: {
          title: 'empty',
          type: 'object',
        },
      },
      securitySchemes: {
        Bearer: {
          type: 'apiKey',
          description: 'Type "Bearer " and then your API Token',
          name: 'Authorization',
          in: 'header',
        },
      },
    },
    'x-original-swagger-version': '2.0',
  });

  it('reduceSpecComponents', () => {
    const reducedSpec = reduceSpecComponents(testSpec, '/v1/device_tasks');
    expect(reducedSpec).toBeDefined();
    expect(Object.keys(Object.keys(reducedSpec?.schemas ?? [])).length).toBe(5);
  });
});
