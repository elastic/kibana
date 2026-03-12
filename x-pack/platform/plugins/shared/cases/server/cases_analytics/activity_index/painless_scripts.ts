/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredScript } from '@elastic/elasticsearch/lib/api/types';
import { CAI_ACTIVITY_INDEX_VERSION } from './constants';

export const CAI_ACTIVITY_INDEX_SCRIPT_ID = `cai_activity_script_${CAI_ACTIVITY_INDEX_VERSION}`;
export const CAI_ACTIVITY_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: `
    def source = [:];
    source.putAll(ctx._source);
    ctx._source.clear();

    if (source.type == "cases-user-actions") {
      ctx._source.action = source["cases-user-actions"].action;
      ctx._source.type = source["cases-user-actions"].type;

      long milliSinceEpoch = new Date().getTime();
      Instant instant = Instant.ofEpochMilli(milliSinceEpoch);
      ctx._source['@timestamp'] = ZonedDateTime.ofInstant(instant, ZoneId.of('Z'));

      ZonedDateTime zdt_created =
        ZonedDateTime.parse(source["cases-user-actions"].created_at);
      ctx._source.created_at_ms = zdt_created.toInstant().toEpochMilli();
      ctx._source.created_at = source["cases-user-actions"].created_at;

      if (source["cases-user-actions"].created_by != null) {
        ctx._source.created_by = new HashMap();
        ctx._source.created_by.full_name = source["cases-user-actions"].created_by.full_name;
        ctx._source.created_by.username = source["cases-user-actions"].created_by.username;
        ctx._source.created_by.profile_uid = source["cases-user-actions"].created_by.profile_uid;
        ctx._source.created_by.email = source["cases-user-actions"].created_by.email;
      }

      if (source["cases-user-actions"].payload != null) {
        ctx._source.payload = new HashMap();

        if (source["cases-user-actions"].type == "severity" && source["cases-user-actions"].payload.severity != null) {
          ctx._source.payload.severity = source["cases-user-actions"].payload.severity;
        }

        if (source["cases-user-actions"].type == "category" && source["cases-user-actions"].payload.category != null) {
          ctx._source.payload.category = source["cases-user-actions"].payload.category;
        }

        if (source["cases-user-actions"].type == "status" && source["cases-user-actions"].payload.status != null) {
          ctx._source.payload.status = source["cases-user-actions"].payload.status;
        }

        if (source["cases-user-actions"].type == "tags" && source["cases-user-actions"].payload.tags != null) {
          ctx._source.payload.tags = source["cases-user-actions"].payload.tags;
        }

        if (source["cases-user-actions"].type == "assignees" && source["cases-user-actions"].payload.assignees != null) {
          def assigneesList = new ArrayList();
          for (item in source["cases-user-actions"].payload.assignees) {
            def assignee = new HashMap();
            assignee.uid = item.uid;
            assigneesList.add(assignee);
          }
          ctx._source.payload.assignees = assigneesList;
        }

        if (source["cases-user-actions"].type == "pushed" && source["cases-user-actions"].payload.externalService != null) {
          def pushed = new HashMap();
          def svc = source["cases-user-actions"].payload.externalService;
          if (svc.connector_id != null) { pushed.connector_id = svc.connector_id; }
          if (svc.connector_name != null) { pushed.connector_name = svc.connector_name; }
          if (svc.external_id != null) { pushed.external_id = svc.external_id; }
          if (svc.external_title != null) { pushed.external_title = svc.external_title; }
          if (svc.external_url != null) { pushed.external_url = svc.external_url; }
          if (svc.pushed_at != null) { pushed.pushed_at = svc.pushed_at; }
          ctx._source.payload.pushed = pushed;
        }

        if (source["cases-user-actions"].type == "create_case") {
          if (source["cases-user-actions"].payload.title != null) {
            ctx._source.payload.title = source["cases-user-actions"].payload.title;
          }
          if (source["cases-user-actions"].payload.description != null) {
            ctx._source.payload.description = source["cases-user-actions"].payload.description;
          }
          if (source["cases-user-actions"].payload.status != null) {
            ctx._source.payload.status = source["cases-user-actions"].payload.status;
          }
          if (source["cases-user-actions"].payload.severity != null) {
            ctx._source.payload.severity = source["cases-user-actions"].payload.severity;
          }
          if (source["cases-user-actions"].payload.tags != null) {
            ctx._source.payload.tags = source["cases-user-actions"].payload.tags;
          }
          if (source["cases-user-actions"].payload.category != null) {
            ctx._source.payload.category = source["cases-user-actions"].payload.category;
          }
          if (source["cases-user-actions"].payload.assignees != null) {
            def assigneesList = new ArrayList();
            for (item in source["cases-user-actions"].payload.assignees) {
              def assignee = new HashMap();
              assignee.uid = item.uid;
              assigneesList.add(assignee);
            }
            ctx._source.payload.assignees = assigneesList;
          }
          if (source["cases-user-actions"].payload.customFields != null
              && source["cases-user-actions"].payload.customFields.size() > 0) {
            def cf = new HashMap();
            for (field in source["cases-user-actions"].payload.customFields) {
              if (field.key != null && field.value != null) {
                cf[field.key] = field.value;
              }
            }
            if (!cf.isEmpty()) {
              ctx._source.payload.custom_fields = cf;
            }
          }
        }

        if (source["cases-user-actions"].type == "comment" && source["cases-user-actions"].payload.comment != null) {
          if (source["cases-user-actions"].payload.comment.comment != null) {
            ctx._source.payload.comment = source["cases-user-actions"].payload.comment.comment;
          }
          if (source["cases-user-actions"].payload.comment.type != null) {
            ctx._source.payload.comment_type = source["cases-user-actions"].payload.comment.type;
          }
        }

        if (source["cases-user-actions"].type == "comment" && source.references != null) {
          for (ref in source.references) {
            if (ref.type == "cases-comments") {
              ctx._source.payload.comment_id = ref.id;
            }
          }
        }
      }

      if (source.references != null) {
        for (item in source.references) {
          if (item.type == "cases") {
            ctx._source.case_id = item.id;
          }
        }
      }

      ctx._source.owner = source["cases-user-actions"].owner;
      ctx._source.space_ids = source.namespaces;
    } else {
      ctx.op = "noop";
    }
  `,
};
