/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredScript } from '@elastic/elasticsearch/lib/api/types';
import { CAI_ATTACHMENTS_INDEX_VERSION } from './constants';

export const CAI_ATTACHMENTS_INDEX_SCRIPT_ID = `cai_attachments_script_${CAI_ATTACHMENTS_INDEX_VERSION}`;
export const CAI_ATTACHMENTS_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: `
    def source = [:];
    source.putAll(ctx._source);
    ctx._source.clear();

    if (
        (
            source["cases-comments"].type == "externalReference" &&
            source["cases-comments"].externalReferenceAttachmentTypeId != ".files"
        ) &&
        source["cases-comments"].type != "alert"
    ) {
        ctx.op = "noop";
        return;
    }

    long timestampInMillis = new Date().getTime();
    Instant timestampInstance = Instant.ofEpochMilli(timestampInMillis);
    ctx._source['@timestamp'] = ZonedDateTime.ofInstant(timestampInstance, ZoneId.of('Z'));

    ctx._source.type = source["cases-comments"].type;

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
            
            if ( y < source["cases-comments"].index.size() ) {
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
        ctx._source.payload.file.mimeType = source["cases-comments"].externalReferenceMetadata.files[0].mimeType;
        ctx._source.payload.file.name = source["cases-comments"].externalReferenceMetadata.files[0].name;
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

    ctx._source.owner = source["cases-comments"].owner;
    ctx._source.space_ids = source.namespaces;
  `,
};
