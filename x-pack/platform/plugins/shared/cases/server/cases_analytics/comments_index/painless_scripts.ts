/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredScript } from '@elastic/elasticsearch/lib/api/types';

export const CAI_COMMENTS_INDEX_SCRIPT_ID = 'cai_comments_script_1';
export const CAI_COMMENTS_INDEX_SCRIPT: StoredScript = {
  lang: 'painless',
  source: `
    long milliSinceEpoch = new Date().getTime();
    Instant instant = Instant.ofEpochMilli(milliSinceEpoch);
    ctx._source['@timestamp'] = ZonedDateTime.ofInstant(instant, ZoneId.of('Z'));

    ctx._source.comment = ctx._source["cases-comments"].remove("comment");
    ctx._source.created_at = ctx._source["cases-comments"].remove("created_at");
    ctx._source.created_by = ctx._source["cases-comments"].remove("created_by");
    ctx._source.owner = ctx._source["cases-comments"].remove("owner");

    for (item in ctx._source.references) {
      if (item.type == "cases") {
        ctx._source.case_id = item.id;
      }
    }

    ctx._source.remove("updated_at");
    ctx._source.remove("cases-comments");
    ctx._source.remove("type");
    ctx._source.remove("references"); // ?
  `,
};
