/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredScript } from '@elastic/elasticsearch/lib/api/types';

export const CAI_CASES_INDEX_SCRIPT_ID = 'cai_cases_script_1';
export const CAI_CASES_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: `
    String statusDecoder(def x) {
      if (x == 0) {
        return "Open"
      }
      if (x == 10) {
        return "In progress"
      }
      if (x == 20) {
        return "Closed"
      }
      return ""
    }

    String severityDecoder(def x) {
      if (x == 0) {
        return "Low"
      }
      if (x == 10) {
        return "Medium"
      }
      if (x == 20) {
        return "High"
      }
      if (x == 30) {
        return "Critical"
      }
      return ""
    }

    long milliSinceEpoch = new Date().getTime();
    Instant instant = Instant.ofEpochMilli(milliSinceEpoch);
    ctx._source['@timestamp'] = ZonedDateTime.ofInstant(instant, ZoneId.of('Z'));

    ctx._source.title = ctx._source.cases.remove("title");
    ctx._source.description = ctx._source.cases.remove("description");
    ctx._source.tags = ctx._source.cases.remove("tags");
    ctx._source.category = ctx._source.cases.remove("category");
    
    ctx._source.status_sort = ctx._source.cases.remove("status");
    ctx._source.status = statusDecoder(ctx._source.status_sort);

    ctx._source.severity_sort = ctx._source.cases.remove("severity");
    ctx._source.severity = severityDecoder(ctx._source.severity_sort);

    ZonedDateTime zdt_created =
      ZonedDateTime.parse(ctx._source.cases.created_at);
    ctx._source.created_at_ms = zdt_created.toInstant().toEpochMilli();
    ctx._source.created_at = ctx._source.cases.remove("created_at");
    ctx._source.created_by = ctx._source.cases.remove("created_by");

    if ( ctx._source.cases.updated_at != null ) {
      ZonedDateTime zdt_updated =
        ZonedDateTime.parse(ctx._source.cases.updated_at);
      ctx._source.updated_at_ms = zdt_updated.toInstant().toEpochMilli();
      ctx._source.updated_at = ctx._source.cases.remove("updated_at");
      ctx._source.updated_by = ctx._source.cases.remove("updated_by");
    }

    if ( ctx._source.cases.closed_at != null ) {
      ZonedDateTime zdt_closed =
        ZonedDateTime.parse(ctx._source.cases.closed_at);
      ctx._source.closed_at_ms = zdt_closed.toInstant().toEpochMilli();
      ctx._source.closed_at = ctx._source.cases.remove("closed_at");
      ctx._source.closed_by = ctx._source.cases.remove("closed_by");
    }

    ctx._source.assignees = [];
    for (item in ctx._source.cases.assignees) {
      ctx._source.assignees.add(item.uid);
    }
    ctx._source.total_assignees = ctx._source.cases.assignees.size();

    ctx._source.custom_fields = [];
    for (item in ctx._source.cases.customFields) {
      item.remove("key");
      ctx._source.custom_fields.add(item);
    }

    ctx._source.observables = [];
    for (item in ctx._source.cases.observables) {
      item.type = item.remove("typeKey");
      ctx._source.observables.add(item);
    }
    
    ctx._source.owner = ctx._source.cases.remove("owner");

    if (ctx._source.created_at_ms != null && ctx._source.closed_at_ms != null){
      ctx._source.time_to_resolve = (ctx._source.closed_at_ms - ctx._source.created_at_ms) / 1000;
    }

    ctx._source.remove("cases");
    ctx._source.remove("type");
    ctx._source.remove("references"); // ?
  `,
};
