/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esManifest } from '@elastic/schemas/es/tools/manifest.js';
import { kibanaManifest } from '@elastic/schemas/kibana/tools/manifest.js';
import { compact, countBy } from 'lodash';
import {
  allApisSelector,
  toApiNamespace,
  toNamespaceSelector,
  type ApiTarget,
} from '@kbn/agent-builder-common';

interface ApiSelectorOptionBase {
  selector: string;
}

interface AllApisSelectorOption extends ApiSelectorOptionBase {
  kind: 'all';
  apiCount: number;
}

interface NamespaceApiSelectorOption extends ApiSelectorOptionBase {
  kind: 'namespace';
  namespace: string;
  apiCount: number;
}

interface ExactApiSelectorOption extends ApiSelectorOptionBase {
  kind: 'api';
  description: string;
}

/**
 * A selector offered for pre-approval, with metadata corresponding to the selector type.
 */
export type ApiSelectorOption =
  | AllApisSelectorOption
  | NamespaceApiSelectorOption
  | ExactApiSelectorOption;

const toDestructiveApiSelectorOptions = (
  manifest: ReadonlyArray<{ id: string; description: string; destructive: boolean }>
): ApiSelectorOption[] => {
  const destructiveApis = manifest.filter(({ destructive }) => destructive);
  const apiCountByNamespace = countBy(compact(destructiveApis.map(({ id }) => toApiNamespace(id))));
  return [
    { kind: 'all', selector: allApisSelector, apiCount: destructiveApis.length },
    ...Object.keys(apiCountByNamespace)
      .sort()
      .map(
        (namespace): NamespaceApiSelectorOption => ({
          kind: 'namespace',
          selector: toNamespaceSelector(namespace),
          namespace,
          apiCount: apiCountByNamespace[namespace],
        })
      ),
    ...destructiveApis.map(
      ({ id, description }): ExactApiSelectorOption => ({ kind: 'api', selector: id, description })
    ),
  ];
};

/**
 * Destructive selectors keyed by API target, from broadest to narrowest.
 */
export const destructiveApiSelectorOptionsByTarget: Record<
  ApiTarget,
  readonly ApiSelectorOption[]
> = {
  elasticsearch: toDestructiveApiSelectorOptions(esManifest),
  kibana: toDestructiveApiSelectorOptions(kibanaManifest),
};
