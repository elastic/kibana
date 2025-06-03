/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredScript } from '@elastic/elasticsearch/lib/api/types';

export const CAI_ATTACHMENTS_INDEX_SCRIPT_ID = 'cai_attachments_script_1';
export const CAI_ATTACHMENTS_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: `
    long timestampInMillis = new Date().getTime();
    Instant timestampInstance = Instant.ofEpochMilli(timestampInMillis);
    ctx._source['@timestamp'] = ZonedDateTime.ofInstant(timestampInstance, ZoneId.of('Z'));

    ctx._source.type = ctx._source["cases-comments"].remove("type");

    if (ctx._source.type == "alert") {
      ctx._source.payload = new HashMap();
      ctx._source.payload.alerts = new HashMap();
      ctx._source.payload.alerts.id = ctx._source["cases-comments"].remove("alertId");
      ctx._source.payload.alerts.index = ctx._source["cases-comments"].remove("index");
    }
    
    if (ctx._source["cases-comments"].externalReferenceAttachmentTypeId == ".files") {
      ctx._source.payload = new HashMap();
      ctx._source.payload.file = new HashMap();
      ctx._source.payload.file.extension = ctx._source["cases-comments"].externalReferenceMetadata.files[0].extension;
      ctx._source.payload.file.mimeType = ctx._source["cases-comments"].externalReferenceMetadata.files[0].mimeType;
      ctx._source.payload.file.name = ctx._source["cases-comments"].externalReferenceMetadata.files[0].name;

      for (item in ctx._source.references) {
        if (item.type == "file") {
          ctx._source.payload.file.id = item.id;
        }
      }
    }
    
    ctx._source.owner = ctx._source["cases-comments"].remove("owner");
    
    ctx._source.remove("cases-comments");
    ctx._source.remove("updated_at");
    ctx._source.remove("type");
    ctx._source.remove("references"); // ?
  
  `,
};
