/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredScript } from '@elastic/elasticsearch/lib/api/types';
import { CAI_CASES_INDEX_VERSION } from './constants';

export const CAI_CASES_INDEX_SCRIPT_ID = `cai_cases_script_${CAI_CASES_INDEX_VERSION}`;
export const CAI_CASES_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: `
    String statusDecoder(def x) {
      if (x == 0) {
        return "open";
      }
      if (x == 10) {
        return "in-progress";
      }
      if (x == 20) {
        return "closed";
      }
      return "";
    }

    String severityDecoder(def x) {
      if (x == 0) {
        return "low"
      }
      if (x == 10) {
        return "medium"
      }
      if (x == 20) {
        return "high"
      }
      if (x == 30) {
        return "critical"
      }
      return ""
    }

    def source = [:];
    source.putAll(ctx._source);
    ctx._source.clear();

    long milliSinceEpoch = new Date().getTime();
    Instant instant = Instant.ofEpochMilli(milliSinceEpoch);
    ctx._source['@timestamp'] = ZonedDateTime.ofInstant(instant, ZoneId.of('Z'));

    ctx._source.title = source.cases.title;
    ctx._source.description = source.cases.description;
    ctx._source.tags = source.cases.tags;
    ctx._source.category = source.cases.category;
    
    ctx._source.status_sort = source.cases.status;
    ctx._source.status = statusDecoder(ctx._source.status_sort);

    ctx._source.severity_sort = source.cases.severity;
    ctx._source.severity = severityDecoder(ctx._source.severity_sort);

    ZonedDateTime zdt_created =
      ZonedDateTime.parse(source.cases.created_at);
    ctx._source.created_at_ms = zdt_created.toInstant().toEpochMilli();
    ctx._source.created_at = source.cases.created_at;

    if (source.cases.created_by != null) {
        ctx._source.created_by = new HashMap();
        ctx._source.created_by.full_name = source.cases.created_by.full_name;
        ctx._source.created_by.username = source.cases.created_by.username;
        ctx._source.created_by.profile_uid = source.cases.created_by.profile_uid;
        ctx._source.created_by.email = source.cases.created_by.email;
    }

    if ( source.cases.updated_at != null ) {
      ZonedDateTime zdt_updated =
        ZonedDateTime.parse(source.cases.updated_at);
      ctx._source.updated_at_ms = zdt_updated.toInstant().toEpochMilli();
      ctx._source.updated_at = source.cases.updated_at;
    }

    if (source.cases.updated_by != null) {
        ctx._source.updated_by = new HashMap();
        ctx._source.updated_by.full_name = source.cases.updated_by.full_name;
        ctx._source.updated_by.username = source.cases.updated_by.username;
        ctx._source.updated_by.profile_uid = source.cases.updated_by.profile_uid;
        ctx._source.updated_by.email = source.cases.updated_by.email;
    }

    if ( source.cases.closed_at != null ) {
      ZonedDateTime zdt_closed =
        ZonedDateTime.parse(source.cases.closed_at);
      ctx._source.closed_at_ms = zdt_closed.toInstant().toEpochMilli();
      ctx._source.closed_at = source.cases.closed_at;
    }

    if (source.cases.closed_by != null) {
        ctx._source.closed_by = new HashMap();
        ctx._source.closed_by.full_name = source.cases.closed_by.full_name;
        ctx._source.closed_by.username = source.cases.closed_by.username;
        ctx._source.closed_by.profile_uid = source.cases.closed_by.profile_uid;
        ctx._source.closed_by.email = source.cases.closed_by.email;
    }

    ctx._source.assignees = [];

    if (source.cases.assignees != null) {
      for (item in source.cases.assignees) {
        ctx._source.assignees.add(item.uid);
      }
      ctx._source.total_assignees = source.cases.assignees.size();
    }

    ctx._source.custom_fields = [];
    if (source.cases.customFields != null) {
      for (item in source.cases.customFields) {
          Map customField = new HashMap();

          customField.type = item.type;
          customField.value = item.value;
          customField.key = item.key;
          
          ctx._source.custom_fields.add(customField);
      }
    }

    ctx._source.observables = [];
    if (source.cases.observables != null) {
      for (item in source.cases.observables) {
          Map observable = new HashMap();

          observable.label = item.label;
          observable.type = item.typeKey;
          observable.value = item.value;

          ctx._source.observables.add(observable);
      }
    }
    
    ctx._source.owner = source.cases.owner;
    ctx._source.space_ids = source.namespaces;

    if (source.cases.time_to_acknowledge != null){
      ctx._source.time_to_acknowledge = source.cases.time_to_acknowledge;
    }

    if (source.cases.time_to_investigate != null){
      ctx._source.time_to_investigate = source.cases.time_to_investigate;
    }

    if (source.cases.time_to_resolve != null){
      ctx._source.time_to_resolve = source.cases.time_to_resolve;
    }

    if (source.cases.total_alerts != null && source.cases.total_alerts >= 0){
      ctx._source.total_alerts = source.cases.total_alerts;
    }

    if (source.cases.total_comments != null && source.cases.total_comments >= 0){
      ctx._source.total_comments = source.cases.total_comments;
    }
  `,
};
