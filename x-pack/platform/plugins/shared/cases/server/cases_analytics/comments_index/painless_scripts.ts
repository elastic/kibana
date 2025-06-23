/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredScript } from '@elastic/elasticsearch/lib/api/types';
import { CAI_COMMENTS_INDEX_VERSION } from './constants';

export const CAI_COMMENTS_INDEX_SCRIPT_ID = `cai_comments_script_${CAI_COMMENTS_INDEX_VERSION}`;
export const CAI_COMMENTS_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: `
    def source = [:];
    source.putAll(ctx._source);
    ctx._source.clear();

    long milliSinceEpoch = new Date().getTime();
    Instant instant = Instant.ofEpochMilli(milliSinceEpoch);
    ctx._source['@timestamp'] = ZonedDateTime.ofInstant(instant, ZoneId.of('Z'));

    ctx._source.comment = source["cases-comments"].comment;
    ctx._source.created_at = source["cases-comments"].created_at;
    ctx._source.created_by = source["cases-comments"].created_by;
    ctx._source.owner = source["cases-comments"].owner;
    ctx._source.space_ids = source.namespaces;

    if ( source["cases-comments"].updated_at != null ) {
      ctx._source.updated_at = source["cases-comments"].updated_at;
    }

    if (source["cases-comments"].updated_by != null) {
        ctx._source.updated_by = new HashMap();
        ctx._source.updated_by.full_name = source["cases-comments"].updated_by.full_name;
        ctx._source.updated_by.username = source["cases-comments"].updated_by.username;
        ctx._source.updated_by.profile_uid = source["cases-comments"].updated_by.profile_uid;
        ctx._source.updated_by.email = source["cases-comments"].updated_by.email;
    }
    
    if (source.references != null) {
      for (item in source.references) {
        if (item.type == "cases") {
          ctx._source.case_id = item.id;
        }
      }
    }
  `,
};
