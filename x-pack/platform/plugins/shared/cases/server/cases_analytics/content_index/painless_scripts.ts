/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredScript } from '@elastic/elasticsearch/lib/api/types';
import { CAI_CONTENT_INDEX_VERSION } from './constants';

export const CAI_CONTENT_INDEX_SCRIPT_ID = `cai_content_script_${CAI_CONTENT_INDEX_VERSION}`;

/**
 * Merged Painless script for the consolidated content index.
 *
 * Dispatches on the source SO type:
 *  - `cases`         → doc_type: 'case'
 *  - `cases-comments` with type 'user' → doc_type: 'comment'
 *  - `cases-comments` with type 'alert'|'externalReference' → doc_type: 'attachment'
 *
 * Attachment filtering (skip unsupported externalReference types) is replicated
 * from the original attachments script.
 */
export const CAI_CONTENT_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: `
    // ---- helpers ----

    String statusDecoder(def x) {
      if (x == 0) { return "open"; }
      if (x == 10) { return "in-progress"; }
      if (x == 20) { return "closed"; }
      return "";
    }

    String severityDecoder(def x) {
      if (x == 0) { return "low"; }
      if (x == 10) { return "medium"; }
      if (x == 20) { return "high"; }
      if (x == 30) { return "critical"; }
      return "";
    }

    // ---- common setup ----

    def source = [:];
    source.putAll(ctx._source);
    ctx._source.clear();

    long milliSinceEpoch = new Date().getTime();
    Instant instant = Instant.ofEpochMilli(milliSinceEpoch);
    ctx._source['@timestamp'] = ZonedDateTime.ofInstant(instant, ZoneId.of('Z'));

    // ---- dispatch on SO type ----

    if (source.type == "cases") {
      // ===== CASE document =====
      ctx._source.doc_type = "case";

      ctx._source.title       = source.cases.title;
      ctx._source.description = source.cases.description;
      ctx._source.tags        = source.cases.tags;
      ctx._source.category    = source.cases.category;

      ctx._source.status_sort = source.cases.status;
      ctx._source.status      = statusDecoder(ctx._source.status_sort);

      ctx._source.severity_sort = source.cases.severity;
      ctx._source.severity      = severityDecoder(ctx._source.severity_sort);

      ZonedDateTime zdt_created = ZonedDateTime.parse(source.cases.created_at);
      ctx._source.created_at_ms = zdt_created.toInstant().toEpochMilli();
      ctx._source.created_at    = source.cases.created_at;

      if (source.cases.created_by != null) {
        ctx._source.created_by = new HashMap();
        ctx._source.created_by.full_name   = source.cases.created_by.full_name;
        ctx._source.created_by.username    = source.cases.created_by.username;
        ctx._source.created_by.profile_uid = source.cases.created_by.profile_uid;
        ctx._source.created_by.email       = source.cases.created_by.email;
      }

      if (source.cases.updated_at != null) {
        ZonedDateTime zdt_updated = ZonedDateTime.parse(source.cases.updated_at);
        ctx._source.updated_at_ms = zdt_updated.toInstant().toEpochMilli();
        ctx._source.updated_at    = source.cases.updated_at;
      }

      if (source.cases.updated_by != null) {
        ctx._source.updated_by = new HashMap();
        ctx._source.updated_by.full_name   = source.cases.updated_by.full_name;
        ctx._source.updated_by.username    = source.cases.updated_by.username;
        ctx._source.updated_by.profile_uid = source.cases.updated_by.profile_uid;
        ctx._source.updated_by.email       = source.cases.updated_by.email;
      }

      if (source.cases.closed_at != null) {
        ZonedDateTime zdt_closed = ZonedDateTime.parse(source.cases.closed_at);
        ctx._source.closed_at_ms = zdt_closed.toInstant().toEpochMilli();
        ctx._source.closed_at    = source.cases.closed_at;
      }

      if (source.cases.closed_by != null) {
        ctx._source.closed_by = new HashMap();
        ctx._source.closed_by.full_name   = source.cases.closed_by.full_name;
        ctx._source.closed_by.username    = source.cases.closed_by.username;
        ctx._source.closed_by.profile_uid = source.cases.closed_by.profile_uid;
        ctx._source.closed_by.email       = source.cases.closed_by.email;
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
          customField.type  = item.type;
          customField.value = item.value;
          customField.key   = item.key;
          ctx._source.custom_fields.add(customField);
        }
      }

      ctx._source.observables = [];
      if (source.cases.observables != null) {
        for (item in source.cases.observables) {
          Map observable = new HashMap();
          observable.label = item.label;
          observable.type  = item.typeKey;
          observable.value = item.value;
          ctx._source.observables.add(observable);
        }
      }

      ctx._source.owner     = source.cases.owner;
      ctx._source.space_ids = source.namespaces;

      if (source.cases.time_to_acknowledge != null) {
        ctx._source.time_to_acknowledge = source.cases.time_to_acknowledge;
      }
      if (source.cases.time_to_investigate != null) {
        ctx._source.time_to_investigate = source.cases.time_to_investigate;
      }
      if (source.cases.time_to_resolve != null) {
        ctx._source.time_to_resolve = source.cases.time_to_resolve;
      }
      if (source.cases.total_alerts != null && source.cases.total_alerts >= 0) {
        ctx._source.total_alerts = source.cases.total_alerts;
      }
      if (source.cases.total_comments != null && source.cases.total_comments >= 0) {
        ctx._source.total_comments = source.cases.total_comments;
      }

      // Extended fields: copy the flat map as-is; dynamic_templates handle typing.
      if (source.cases.extended_fields != null) {
        ctx._source.extended_fields = source.cases.extended_fields;
      }

      // case_id for the case itself is the SO id
      ctx._source.case_id = ctx._id;

    } else if (source.type == "cases-comments" && source["cases-comments"].type == "user") {
      // ===== COMMENT document =====
      ctx._source.doc_type = "comment";

      ctx._source.comment    = source["cases-comments"].comment;
      ctx._source.created_at = source["cases-comments"].created_at;
      ctx._source.created_by = source["cases-comments"].created_by;
      ctx._source.owner      = source["cases-comments"].owner;
      ctx._source.space_ids  = source.namespaces;

      if (source["cases-comments"].updated_at != null) {
        ctx._source.updated_at = source["cases-comments"].updated_at;
      }

      if (source["cases-comments"].updated_by != null) {
        ctx._source.updated_by = new HashMap();
        ctx._source.updated_by.full_name   = source["cases-comments"].updated_by.full_name;
        ctx._source.updated_by.username    = source["cases-comments"].updated_by.username;
        ctx._source.updated_by.profile_uid = source["cases-comments"].updated_by.profile_uid;
        ctx._source.updated_by.email       = source["cases-comments"].updated_by.email;
      }

      if (source.references != null) {
        for (item in source.references) {
          if (item.type == "cases") {
            ctx._source.case_id = item.id;
          }
        }
      }

    } else if (
      source.type == "cases-comments" &&
      (source["cases-comments"].type == "alert" || source["cases-comments"].type == "externalReference")
    ) {
      // ===== ATTACHMENT document =====

      // Skip unsupported externalReference attachments (not file attachments, not alerts)
      if (
        source["cases-comments"].type == "externalReference" &&
        source["cases-comments"].externalReferenceAttachmentTypeId != ".files"
      ) {
        ctx.op = "noop";
        return;
      }

      ctx._source.doc_type = "attachment";

      ctx._source.type      = source["cases-comments"].type;
      ctx._source.owner     = source["cases-comments"].owner;
      ctx._source.space_ids = source.namespaces;

      if (
        ctx._source.type == "alert" &&
        source["cases-comments"].alertId != null &&
        source["cases-comments"].index != null
      ) {
        ctx._source.payload = new HashMap();
        ctx._source.payload.alerts = new ArrayList();

        for (int y = 0; y < source["cases-comments"].alertId.size(); y++) {
          Map alert = new HashMap();
          alert.id = source["cases-comments"].alertId[y];
          if (y < source["cases-comments"].index.size()) {
            alert.index = source["cases-comments"].index[y];
          }
          ctx._source.payload.alerts.add(alert);
        }
      }

      if (
        ctx._source.type == "externalReference" &&
        source["cases-comments"].externalReferenceAttachmentTypeId == ".files" &&
        source["cases-comments"].externalReferenceMetadata.files.size() > 0
      ) {
        ctx._source.payload = new HashMap();
        ctx._source.payload.file = new HashMap();
        ctx._source.payload.file.extension = source["cases-comments"].externalReferenceMetadata.files[0].extension;
        ctx._source.payload.file.mimeType  = source["cases-comments"].externalReferenceMetadata.files[0].mimeType;
        ctx._source.payload.file.name      = source["cases-comments"].externalReferenceMetadata.files[0].name;
      }

      if (source.references != null) {
        for (item in source.references) {
          if (item.type == "file") {
            ctx._source.payload.file.id = item.id;
          } else if (item.type == "cases") {
            ctx._source.case_id = item.id;
          }
        }
      }

    } else {
      // Unknown SO type — skip the document
      ctx.op = "noop";
    }
  `,
};
