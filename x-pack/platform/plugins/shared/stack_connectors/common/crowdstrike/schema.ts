/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SUB_ACTION } from './constants';

// Connector schema
export const CrowdstrikeConfigSchema = z
  .object({
    url: z.string(),
  })
  .strict();
export const CrowdstrikeSecretsSchema = z
  .object({
    clientId: z.string(),
    clientSecret: z.string(),
  })
  .strict();

export const CrowdstrikeApiDoNotValidateResponsesSchema = z.any();

export const RelaxedCrowdstrikeBaseApiResponseSchema = z.object({}).passthrough().optional();

export const CrowdstrikeBaseApiResponseSchema = z
  .object({
    resources: z.array(z.any()),
    errors: z.array(z.any()).nullable().default(null),
    meta: z
      .object({
        query_time: z.coerce.number().optional(),
        powered_by: z.string().optional(),
        trace_id: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const CrowdstrikeGetAgentOnlineStatusResponseSchema = z
  .object({
    resources: z.array(
      z
        .object({
          state: z.string().optional(),
          id: z.string().optional(),
          last_seen: z.string().optional(),
        })
        .passthrough()
    ),
    errors: z.array(z.any()).nullable().default(null),
    meta: z
      .object({
        query_time: z.coerce.number().optional(),
        powered_by: z.string().optional(),
        trace_id: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const CrowdstrikeGetAgentsResponseSchema = z
  .object({
    resources: z.array(
      z
        .object({
          device_id: z.string().optional(),
          cid: z.string().optional(),
          agent_load_flags: z.string().optional(),
          agent_local_time: z.string().optional(),
          agent_version: z.string().optional(),
          bios_manufacturer: z.string().optional(),
          bios_version: z.string().optional(),
          config_id_base: z.string().optional(),
          config_id_build: z.string().optional(),
          config_id_platform: z.string().optional(),
          cpu_signature: z.string().optional(),
          cpu_vendor: z.string().optional(),
          external_ip: z.string().optional(),
          mac_address: z.string().optional(),
          instance_id: z.string().optional(),
          service_provider: z.string().optional(),
          service_provider_account_id: z.string().optional(),
          hostname: z.string().optional(),
          first_seen: z.string().optional(),
          last_login_timestamp: z.string().optional(),
          last_login_user: z.string().optional(),
          last_login_uid: z.string().optional(),
          last_seen: z.string().optional(),
          local_ip: z.string().optional(),
          major_version: z.string().optional(),
          minor_version: z.string().optional(),
          os_version: z.string().optional(),
          platform_id: z.string().optional(),
          platform_name: z.string().optional(),
          policies: z
            .array(
              z
                .object({
                  policy_type: z.string().optional(),
                  policy_id: z.string().optional(),
                  applied: z.boolean().optional(),
                  settings_hash: z.string().optional(),
                  assigned_date: z.string().optional(),
                  applied_date: z.string().optional(),
                  rule_groups: z.any().optional(),
                })
                .passthrough()
            )
            .optional(),
          reduced_functionality_mode: z.string().optional(),
          device_policies: z
            .object({
              prevention: z
                .object({
                  policy_type: z.string().optional(),
                  policy_id: z.string().optional(),
                  applied: z.boolean().optional(),
                  settings_hash: z.string().optional(),
                  assigned_date: z.string().optional(),
                  applied_date: z.string().optional(),
                  rule_groups: z.any().optional(),
                })
                .passthrough(),
              sensor_update: z
                .object({
                  policy_type: z.string().optional(),
                  policy_id: z.string().optional(),
                  applied: z.boolean().optional(),
                  settings_hash: z.string().optional(),
                  assigned_date: z.string().optional(),
                  applied_date: z.string().optional(),
                  uninstall_protection: z.string().optional(),
                })
                .passthrough(),
              global_config: z
                .object({
                  policy_type: z.string().optional(),
                  policy_id: z.string().optional(),
                  applied: z.boolean().optional(),
                  settings_hash: z.string().optional(),
                  assigned_date: z.string().optional(),
                  applied_date: z.string().optional(),
                })
                .passthrough(),
              remote_response: z
                .object({
                  policy_type: z.string().optional(),
                  policy_id: z.string().optional(),
                  applied: z.boolean().optional(),
                  settings_hash: z.string().optional(),
                  assigned_date: z.string().optional(),
                  applied_date: z.string().optional(),
                })
                .passthrough(),
            })
            .passthrough()
            .optional(),
          groups: z.array(z.any()).optional(),
          group_hash: z.string().optional(),
          product_type_desc: z.string().optional(),
          provision_status: z.string().optional(),
          serial_number: z.string().optional(),
          status: z.string().optional(),
          system_manufacturer: z.string().optional(),
          system_product_name: z.string().optional(),
          tags: z.array(z.any()).optional(),
          modified_timestamp: z.any(),
          meta: z
            .object({
              version: z.string().optional(),
              version_string: z.string().optional(),
            })
            .passthrough()
            .optional(),
          zone_group: z.string().optional(),
          kernel_version: z.string().optional(),
          chassis_type: z.string().optional(),
          chassis_type_desc: z.string().optional(),
          connection_ip: z.string().optional(),
          default_gateway_ip: z.string().optional(),
          connection_mac_address: z.string().optional(),
          linux_sensor_mode: z.string().optional(),
          deployment_type: z.string().optional(),
        })
        .passthrough()
    ),
    errors: z.array(z.any()).nullable().default(null),
    meta: z
      .object({
        query_time: z.coerce.number().optional(),
        powered_by: z.string().optional(),
        trace_id: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();
export const CrowdstrikeHostActionsResponseSchema = z
  .object({
    resources: z.array(
      z
        .object({
          id: z.string().optional(),
          path: z.string().optional(),
        })
        .passthrough()
    ),
    meta: z
      .object({
        query_time: z.coerce.number().optional(),
        powered_by: z.string().optional(),
        trace_id: z.string().optional(),
      })
      .passthrough(),
    errors: z.array(z.any()).nullable().default(null),
  })
  .passthrough();

// TODO temporary any value
export const CrowdstrikeRTRCommandParamsSchema = z.any();
export const CrowdstrikeHostActionsParamsSchema = z
  .object({
    command: z.enum(['contain', 'lift_containment']),
    actionParameters: z.object({}).passthrough().optional(),
    ids: z.array(z.string()),
    alertIds: z.array(z.string()).optional(),
    comment: z.string().optional(),
  })
  .strict();

export const CrowdstrikeGetAgentsParamsSchema = z
  .object({
    ids: z.array(z.string()),
  })
  .strict();
export const CrowdstrikeGetTokenResponseSchema = z
  .object({
    access_token: z.string(),
    expires_in: z.coerce.number(),
    token_type: z.string(),
    id_token: z.string().optional(),
    issued_token_type: z.string().optional(),
    refresh_token: z.string().optional(),
    scope: z.string().optional(),
  })
  .passthrough();

export const CrowdstrikeHostActionsSchema = z
  .object({
    subAction: z.literal(SUB_ACTION.HOST_ACTIONS),
    subActionParams: CrowdstrikeHostActionsParamsSchema,
  })
  .strict();

export const CrowdstrikeActionParamsSchema = CrowdstrikeHostActionsSchema;

export const CrowdstrikeInitRTRResponseSchema = z
  .object({
    meta: z
      .object({
        query_time: z.coerce.number().optional(),
        powered_by: z.string().optional(),
        trace_id: z.string().optional(),
      })
      .passthrough()
      .optional(),
    batch_id: z.string().optional(),
    resources: z
      .record(
        z.string(),
        z
          .object({
            session_id: z.string().optional(),
            task_id: z.string().optional(),
            complete: z.boolean().optional(),
            stdout: z.string().optional(),
            stderr: z.string().optional(),
            base_command: z.string().optional(),
            aid: z.string().optional(),
            errors: z.array(z.any()).optional(),
            query_time: z.coerce.number().optional(),
            offline_queued: z.boolean().optional(),
          })
          .passthrough()
      )
      .optional(),
    errors: z.array(z.any()).optional(),
  })
  .passthrough();

export const CrowdstrikeInitRTRParamsSchema = z
  .object({
    endpoint_ids: z.array(z.string()),
  })
  .strict();

export const CrowdstrikeExecuteRTRResponseSchema = z
  .object({
    combined: z
      .object({
        resources: z.record(
          z.string(),
          z
            .object({
              session_id: z.string(),
              task_id: z.string(),
              complete: z.boolean(),
              stdout: z.string(),
              stderr: z.string(),
              base_command: z.string(),
              aid: z.string(),
              errors: z.array(z.any()),
              query_time: z.coerce.number(),
              offline_queued: z.boolean(),
            })
            .passthrough()
        ),
      })
      .passthrough(),
    meta: z
      .object({
        query_time: z.coerce.number(),
        powered_by: z.string(),
        trace_id: z.string(),
      })
      .passthrough(),
    errors: z.array(z.any()).nullable().default(null),
  })
  .passthrough();

export const CrowdstrikeGetScriptsResponseSchema = z
  .object({
    meta: z
      .object({
        query_time: z.coerce.number().optional(),
        powered_by: z.string().optional(),
        trace_id: z.string().optional(),
      })
      .passthrough()
      .optional(),
    resources: z
      .array(
        z
          .object({
            content: z.string().optional(),
            created_by: z.string().optional(),
            created_by_uuid: z.string().optional(),
            created_timestamp: z.string().optional(),
            file_type: z.string().optional(),
            id: z.string().optional(),
            description: z.string().optional(),
            modified_by: z.string().optional(),
            modified_timestamp: z.string().optional(),
            name: z.string().optional(),
            permission_type: z.string().optional(),
            platform: z.array(z.string()).optional(),
            run_attempt_count: z.coerce.number().optional(),
            run_success_count: z.coerce.number().optional(),
            sha256: z.string().optional(),
            size: z.coerce.number().optional(),
            write_access: z.boolean().optional(),
          })
          .passthrough()
      )
      .optional(),
    errors: z.array(z.any()).optional(),
  })
  .passthrough();
