/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import type { ResolvedResourceWithSampling } from './resolve_resource_with_sampling_stats';
import type { MappingFieldWithStats } from '../sampling';
import type { XmlNode } from '../formatting';
import { generateXmlTree } from '../formatting';

/**
 * Represents a resource as a xml tree,
 * useful for including them into a prompt
 */
export const formatResourceWithSampledValues = ({
  resource,
  indentLevel,
}: {
  resource: ResolvedResourceWithSampling;
  indentLevel?: number;
}) => {
  return generateXmlTree(
    {
      tagName: 'target_resource',
      attributes: {
        name: resource.name,
        type: resource.type,
      },
      children: [
        {
          tagName: 'fields',
          children: resource.fields.map((field) => mapFieldWithStats(field, 3)),
        },
      ],
    },
    { initialIndentLevel: indentLevel }
  );
};

const mapFieldWithStats = (field: MappingFieldWithStats, maxValues: number = 3): XmlNode => {
  return {
    tagName: 'field',
    attributes: {
      path: field.path,
      type: field.type,
      description: field.meta.description,
    },
    children: field.stats.values.length
      ? [
          {
            tagName: 'sample_values',
            children: take(field.stats.values, maxValues).map<XmlNode>((value) => {
              return {
                tagName: 'value',
                children: [truncate(normalizeSpaces(`${value.value}`), 100)],
              };
            }),
          },
        ]
      : undefined,
  };
};

const truncate = (text: unknown, maxLength: number): string => {
  const str = String(text);
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + '[truncated]';
};

const normalizeSpaces = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};
