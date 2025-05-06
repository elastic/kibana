/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { serializeTemplate, serializeLegacyTemplate } from '../../../../common/lib';
import { TemplateDeserialized, LegacyTemplateSerialized } from '../../../../common';

export const doesTemplateExist = async ({
  name,
  client,
  isLegacy,
}: {
  name: string;
  client: IScopedClusterClient;
  isLegacy?: boolean;
}) => {
  if (isLegacy) {
    return await client.asCurrentUser.indices.existsTemplate({ name });
  }

  return await client.asCurrentUser.indices.existsIndexTemplate({ name });
};

export const saveTemplate = async ({
  template,
  client,
  isLegacy,
  dataStreamOptions,
}: {
  template: TemplateDeserialized;
  client: IScopedClusterClient;
  isLegacy?: boolean;
  dataStreamOptions?: object | undefined;
}) => {
  const serializedTemplate = isLegacy
    ? serializeLegacyTemplate(template)
    : serializeTemplate(template, dataStreamOptions);

  if (isLegacy) {
    const { settings } = serializedTemplate as LegacyTemplateSerialized;

    return await client.asCurrentUser.indices.putTemplate({
      name: template.name,
      ...serializedTemplate,
      // @ts-expect-error Types of property auto_expand_replicas are incompatible.
      settings,
    });
  }

  return await client.asCurrentUser.indices.putIndexTemplate({
    name: template.name,
    ...(serializedTemplate as Omit<IndicesPutIndexTemplateRequest, 'name'>),
  });
};

export const getTemplateDataStreamOptions = async ({
  name,
  client,
  isLegacy,
}: {
  name: string;
  client: IScopedClusterClient;
  isLegacy?: boolean;
}) => {
  if (isLegacy) {
    return undefined;
  }
  const existingTemplate = await client.asCurrentUser.transport.request<{
    index_templates?: Array<{
      index_template?: { template?: { data_stream_options?: unknown } };
    }>;
  }>({
    method: 'GET',
    path: `/_index_template/${name}`,
  });
  // TBD: Replace with the following when the client includes data_stream_options in IndicesIndexTemplateSummary
  // const existingTemplate = await client.asCurrentUser.indices.getIndexTemplate({
  //   name,
  // });

  return (
    existingTemplate?.index_templates?.[0]?.index_template?.template?.data_stream_options ??
    undefined
  );
};
