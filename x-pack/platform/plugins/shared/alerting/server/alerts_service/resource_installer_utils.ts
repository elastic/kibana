/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  MappingDynamicTemplate,
} from '@elastic/elasticsearch/lib/api/types';
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import { getComponentTemplateFromFieldMap } from '../../common';

interface GetComponentTemplateNameOpts {
  context?: string;
  name?: string;
}

export const VALID_ALERT_INDEX_PREFIXES = [
  '.ds-.alerts-',
  '.alerts-',
  '.internal.alerts-',
  '.reindexed-v8-internal.alerts-',
  '.preview.alerts-',
  '.internal.preview.alerts-',
  '.reindexed-v8-internal.preview.alerts-',
  '.adhoc.alerts-',
  '.internal.adhoc.alerts-',
];

export const getComponentTemplateName = ({ context, name }: GetComponentTemplateNameOpts = {}) =>
  `.alerts-${context ? `${context}.alerts` : name ? name : 'framework'}-mappings`;

export interface IIndexPatternString {
  template: string;
  pattern: string;
  reindexedPattern?: string;
  alias: string;
  name: string;
  basePattern: string;
  validPrefixes?: string[];
  secondaryAlias?: string;
}

interface GetIndexTemplateAndPatternOpts {
  context: string;
  secondaryAlias?: string;
  namespace?: string;
}

export const getIndexTemplateAndPattern = ({
  context,
  namespace,
  secondaryAlias,
}: GetIndexTemplateAndPatternOpts): IIndexPatternString => {
  const concreteNamespace = namespace ? namespace : 'default';
  const pattern = `${context}.alerts`;
  const patternWithNamespace = `${pattern}-${concreteNamespace}`;
  return {
    template: `.alerts-${patternWithNamespace}-index-template`,
    pattern: `.internal.alerts-${patternWithNamespace}-*`,
    reindexedPattern: `.reindexed-v8-internal.alerts-${patternWithNamespace}-*`,
    basePattern: `.alerts-${pattern}-*`,
    name: `.internal.alerts-${patternWithNamespace}-000001`,
    alias: `.alerts-${patternWithNamespace}`,
    validPrefixes: VALID_ALERT_INDEX_PREFIXES,
    ...(secondaryAlias ? { secondaryAlias: `${secondaryAlias}-${concreteNamespace}` } : {}),
  };
};

type GetComponentTemplateOpts = GetComponentTemplateNameOpts & {
  fieldMap: FieldMap;
  dynamic?: 'strict' | false;
  includeSettings?: boolean;
  dynamicTemplates?: Array<Record<string, MappingDynamicTemplate>>;
};

export const getComponentTemplate = ({
  fieldMap,
  context,
  name,
  dynamic,
  includeSettings,
  dynamicTemplates,
}: GetComponentTemplateOpts): ClusterPutComponentTemplateRequest =>
  getComponentTemplateFromFieldMap({
    name: getComponentTemplateName({ context, name }),
    fieldMap,
    dynamic,
    includeSettings,
    dynamicTemplates,
  });
