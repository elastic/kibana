/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Streams } from '@kbn/streams-schema';
import { Streams as StreamsSchema, getParentId } from '@kbn/streams-schema';
import { useKibana } from '../../../../../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../../../../../hooks/use_streams_app_router';

export interface InheritLink {
  href: string;
  label: string;
}

export interface InheritLinkLabels {
  classicIndexTemplate: string;
  wiredParentStream: string;
}

export const useInheritLink = (
  definition: Streams.ingest.all.GetResponse,
  labels: InheritLinkLabels
): InheritLink | undefined => {
  const {
    core: { application },
  } = useKibana();
  const router = useStreamsAppRouter();

  return useMemo(() => {
    const isClassic = StreamsSchema.ClassicStream.GetResponse.is(definition);
    const isWired = StreamsSchema.WiredStream.GetResponse.is(definition);

    if (isClassic) {
      const templateName = definition.elasticsearch_assets?.indexTemplate;
      if (!templateName) return undefined;
      return {
        href: application.getUrlForApp('management', {
          path: `data/index_management/templates/${encodeURIComponent(templateName)}`,
        }),
        label: labels.classicIndexTemplate,
      };
    }

    if (isWired) {
      const parentId = getParentId(definition.stream.name);
      if (!parentId) return undefined;
      return {
        href: router.link('/{key}/management/{tab}', { path: { key: parentId, tab: 'lifecycle' } }),
        label: labels.wiredParentStream,
      };
    }

    return undefined;
  }, [application, definition, labels.classicIndexTemplate, labels.wiredParentStream, router]);
};
