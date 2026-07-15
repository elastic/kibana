/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentPack, ContentPackIncludedObjects } from '@kbn/content-packs-schema';
import type { HttpSetup } from '@kbn/core/public';
import type { Streams } from '@kbn/streams-schema';

export async function importContent({
  file,
  http,
  definition,
  include,
}: {
  file: File;
  http: HttpSetup;
  definition: Streams.all.GetResponse;
  include: ContentPackIncludedObjects;
}) {
  const body = new FormData();
  body.append('content', file);
  body.append('include', JSON.stringify(include));

  const response = await http.post(`/api/streams/${definition.stream.name}/content/import`, {
    body,
    headers: {
      // Important to be undefined, it forces proper headers to be set for FormData
      'Content-Type': undefined,
    },
  });

  return response;
}

export async function previewContent({
  http,
  file,
  definition,
}: {
  http: HttpSetup;
  file: File;
  definition: Streams.all.GetResponse;
}) {
  const body = new FormData();
  body.append('content', file);

  const contentPack = await http.post<ContentPack>(
    `/internal/streams/${definition.stream.name}/content/preview`,
    {
      body,
      headers: {
        // Important to be undefined, it forces proper headers to be set for FormData
        'Content-Type': undefined,
      },
    }
  );

  return contentPack;
}
