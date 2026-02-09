/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EsqlResults } from '@kbn/agent-builder-common/tools/tool_result';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';

interface EsqlResultsStepProps {
  result: EsqlResults;
}

export const EsqlResultsStep: React.FC<EsqlResultsStepProps> = ({ result: { data } }) => {
  const {
    startDependencies: { share },
  } = useAgentBuilderServices();

  const {
    url: { locators },
  } = share;

  const discoverLocator = useMemo(() => locators.get('DISCOVER_APP_LOCATOR'), [locators]);

  const { query: esqlQuery } = data;

  const discoverUrl = useMemo(() => {
    if (!esqlQuery) return undefined;
    return discoverLocator?.getRedirectUrl({
      query: { esql: esqlQuery },
    });
  }, [discoverLocator, esqlQuery]);

  return (
    <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
      <EuiText size="s">
        <FormattedMessage
          id="xpack.agentBuilder.conversation.thinking.esqlResultsStep.foundRecordsMessage"
          defaultMessage="Found {results}"
          values={{
            results: (
              <EuiLink
                href={discoverUrl}
                data-test-subj="agent-builder-esql-data-result-see-in-discover"
                aria-label={i18n.translate(
                  'xpack.agentBuilder.conversation.thinking.esqlResultsStep.seeInDiscoverAriaLabel',
                  {
                    defaultMessage: 'Explore results in Discover',
                  }
                )}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.agentBuilder.conversation.thinking.esqlResultsStep.resultsCount"
                  defaultMessage="{totalResults, plural, one {{totalResults, number} result} other {{totalResults, number} results}}"
                  values={{
                    totalResults: data.values.length,
                  }}
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiFlexGroup>
  );
};
