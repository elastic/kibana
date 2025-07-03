/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IlmLocatorParams, ILM_LOCATOR_ID } from '@kbn/index-lifecycle-management-common-shared';
import {
  IngestStreamEffectiveLifecycle,
  isIlmLifecycle,
  isErrorLifecycle,
  isDslLifecycle,
  Streams,
  getParentId,
  conditionToESQL,
} from '@kbn/streams-schema';
import React from 'react';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { css } from '@emotion/react';
import {
  GrokProcessorDefinition,
  isGrokProcessorDefinition,
} from '@kbn/streams-schema/src/models/ingest/processors';
import { useAbortableAsync } from '@kbn/react-hooks';
import { useKibana } from '../../hooks/use_kibana';
import { getIndexPatterns } from '../../util/hierarchy_helpers';

const DataRetentionTooltip: React.FC<{ children: React.ReactElement }> = ({ children }) => (
  <EuiToolTip
    position="top"
    title={i18n.translate('xpack.streams.badges.lifecycle.title', {
      defaultMessage: 'Data Retention',
    })}
    content={i18n.translate('xpack.streams.badges.lifecycle.description', {
      defaultMessage: 'You can edit retention settings from the stream’s management view',
    })}
    anchorProps={{
      css: css`
        display: inline-flex;
      `,
    }}
  >
    {children}
  </EuiToolTip>
);

export function ClassicStreamBadge() {
  return (
    <EuiToolTip
      position="top"
      title={i18n.translate('xpack.streams.badges.classic.title', {
        defaultMessage: 'Classic Stream',
      })}
      content={i18n.translate('xpack.streams.badges.classic.description', {
        defaultMessage:
          'Classic streams are based on existing data streams and may not support all Streams features like custom re-routing',
      })}
      anchorProps={{
        css: css`
          display: inline-flex;
        `,
      }}
    >
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.unmanagedBadgeLabel', {
          defaultMessage: 'Classic',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}

export function LifecycleBadge({ lifecycle }: { lifecycle: IngestStreamEffectiveLifecycle }) {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

  let badge: React.ReactElement;

  if (isIlmLifecycle(lifecycle)) {
    badge = (
      <EuiBadge color="hollow">
        <EuiLink
          data-test-subj="streamsAppLifecycleBadgeIlmPolicyNameLink"
          color="text"
          target="_blank"
          href={ilmLocator?.getRedirectUrl({
            page: 'policy_edit',
            policyName: lifecycle.ilm.policy,
          })}
        >
          {i18n.translate('xpack.streams.entityDetailViewWithoutParams.ilmBadgeLabel', {
            defaultMessage: 'ILM Policy: {name}',
            values: { name: lifecycle.ilm.policy },
          })}
        </EuiLink>
      </EuiBadge>
    );
  } else if (isErrorLifecycle(lifecycle)) {
    badge = (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.errorBadgeLabel', {
          defaultMessage: 'Error: {message}',
          values: { message: lifecycle.error.message },
        })}
      </EuiBadge>
    );
  } else if (isDslLifecycle(lifecycle)) {
    badge = (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.dslBadgeLabel', {
          defaultMessage: 'Retention: {retention}',
          values: { retention: lifecycle.dsl.data_retention || '∞' },
        })}
      </EuiBadge>
    );
  } else {
    badge = (
      <EuiBadge color="hollow">
        {i18n.translate('xpack.streams.entityDetailViewWithoutParams.disabledLifecycleBadgeLabel', {
          defaultMessage: 'Retention: Disabled',
        })}
      </EuiBadge>
    );
  }

  return <DataRetentionTooltip>{badge}</DataRetentionTooltip>;
}

export function DiscoverBadgeButton({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) {
  const {
    dependencies: {
      start: {
        share,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);
  const dataStreamExists =
    Streams.WiredStream.GetResponse.is(definition) || definition.data_stream_exists;

  const { value: parent } = useAbortableAsync(
    async ({ signal }) => {
      if (Streams.WiredStream.GetResponse.is(definition)) {
        const parentId = getParentId(definition.stream.name);
        if (parentId) {
          const response = await streamsRepositoryClient.fetch(
            'GET /api/streams/{name} 2023-10-31',
            {
              params: { path: { name: parentId } },
              signal,
            }
          );
          if (Streams.WiredStream.GetResponse.is(response)) {
            return response;
          }
          throw new Error('the parent stream is not a wired stream');
        }
      }
      return undefined;
    },
    [definition, streamsRepositoryClient]
  );

  const esqlQuery = definitionToESQLQuery(definition, parent);

  const discoverLink = discoverLocator?.useUrl(
    {
      query: {
        esql: esqlQuery!,
      },
    },
    undefined,
    [esqlQuery]
  );

  if (!discoverLocator || !dataStreamExists || !esqlQuery) {
    return null;
  }

  return (
    <EuiButtonIcon
      data-test-subj="streamsDetailOpenInDiscoverBadgeButton"
      href={discoverLink}
      iconType="discoverApp"
      size="xs"
      aria-label={i18n.translate(
        'xpack.streams.entityDetailViewWithoutParams.openInDiscoverBadgeLabel',
        { defaultMessage: 'Open in Discover' }
      )}
    />
  );
}

function definitionToESQLQuery(
  definition: Streams.ingest.all.GetResponse,
  parent?: Streams.WiredStream.GetResponse
): string | undefined {
  if (!Streams.WiredStream.GetResponse.is(definition) || !definition.stream.ingest.wired.draft) {
    const indexPatterns = getIndexPatterns(definition.stream);
    return indexPatterns ? `FROM ${indexPatterns.join(', ')}` : undefined;
  }

  if (!parent) {
    // If we don't have a parent, we can't construct the ESQL query
    return undefined;
  }

  // This is a draft stream, which means we need to construct it as ESQL.
  // * Field mappings on this level need to go into INSIST_🐔 calls
  // * Processing steps need to be converted to ESQL syntax
  // * The routing condition of the parent needs to be turned into a WHERE clause
  const { stream } = definition;
  const { ingest } = stream;
  const { wired } = ingest;

  // TODO - we need to fetch the mappings for fields that are used for routing as well to add here
  const mappings = Object.entries(wired.fields)
    .map(([fieldName, field]) => {
      // TODO - this only works for keyword - oh well. leave for now, since we are blocked by Elasticsearch here
      return `INSIST_🐔 ${fieldName}`;
    })
    .join(' | ');
  const processingSteps = ingest.processing
    .map((step) => {
      if (isGrokProcessorDefinition(step)) {
        const grok = (step as GrokProcessorDefinition).grok;
        return `GROK ${grok.field} "${grok.patterns[0]}"`;
      }
      if ('rename' in step) {
        return `RENAME ${step.rename.field} AS ${step.rename.target_field}`;
      }
    })
    .join(' | ');
  const routingCondition = parent.stream.ingest.wired.routing.find(
    (r) => r.destination === definition.stream.name
  )?.if;
  // TODO - if there are other draft streams in the routing list of the parent before this one, we need to include their mappings as well and then negate the routing condition to avoid doublematches
  const routingConditionClause = routingCondition
    ? `WHERE ${conditionToESQL(routingCondition)}`
    : '';

  // TODO: Handle the case where the parent is a draft stream too - in this case we would need to
  //      include the parent stream's mappings and processing steps as well and start from the parent of the parent and so on.
  const indexPatterns = getIndexPatterns(parent.stream);

  return [`FROM ${parent.stream}`, mappings, routingConditionClause, processingSteps]
    .filter(Boolean)
    .join(' | ');
}
