/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { capitalize } from 'lodash';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { isKnownApiSelector } from '@kbn/agent-builder-common/apis/known_apis';

const exampleApiByTarget: Record<ApiTarget, string> = {
  elasticsearch: 'indices.create',
  kibana: 'alerting.delete-alerting-rule-id',
};

const apiSelectorArraySchema = ({
  target,
  scope,
  knownApisOnly,
}: {
  target: ApiTarget;
  scope: string;
  knownApisOnly: boolean;
}) => {
  const targetLabel = capitalize(target);
  const exampleApi = exampleApiByTarget[target];
  const exampleNamespace = exampleApi.split('.')[0];
  const unknownApisNote = knownApisOnly
    ? ''
    : ' Entries are not checked against the known APIs, and one that matches no API has no effect.';
  return schema.maybe(
    schema.arrayOf(
      schema.string({
        maxLength: 256,
        ...(knownApisOnly
          ? {
              validate: (api: string) =>
                isKnownApiSelector({ target, api })
                  ? undefined
                  : `Unknown api "${api}" for target "${target}".`,
            }
          : {}),
      }),
      {
        maxSize: 100,
        meta: {
          description:
            `${targetLabel} APIs pre-approved for ${scope}. Each entry is an exact identifier formed ` +
            `from the namespace and name (for example \`${exampleApi}\`), a namespace wildcard ` +
            `(for example \`${exampleNamespace}.*\`), or \`*\` for every ${targetLabel} API.` +
            unknownApisNote,
        },
      }
    )
  );
};

/**
 * Builds the request schema for destructive API selectors keyed by backend.
 *
 * @param scope - What the selectors are pre-approved for, completing "APIs pre-approved for …"
 * in each backend's description (for example `this run`).
 * @param description - Description of the whole object.
 * @param knownApisOnly - Whether to reject a selector not in the API manifests.
 */
export const autoApprovedApisSchema = ({
  scope,
  description,
  knownApisOnly,
}: {
  scope: string;
  description: string;
  knownApisOnly: boolean;
}) =>
  schema.object(
    {
      elasticsearch: apiSelectorArraySchema({ target: 'elasticsearch', scope, knownApisOnly }),
      kibana: apiSelectorArraySchema({ target: 'kibana', scope, knownApisOnly }),
    },
    { meta: { description } }
  );
