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
  `,
};
