/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TabularDataResult } from '@kbn/onechat-common/tools/tool_result';
import { useOnechatServices } from '../../../../../hooks/use_onechat_service';

interface TabularDataResultStepProps {
  result: TabularDataResult;
}

export const TabularDataResultStep: React.FC<TabularDataResultStepProps> = ({
  result: { data },
}) => {
  const {
    startDependencies: { share },
  } = useOnechatServices();

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
        {i18n.translate(
          'xpack.onechat.conversation.thinking.tabularDataResultStep.foundRecordsMessagePrefix',
          {
            defaultMessage: 'Found',
          }
        )}
      </EuiText>
      {discoverUrl && (
        <EuiLink
          href={discoverUrl}
          data-test-subj="onechat-esql-data-result-see-in-discover"
          aria-label={i18n.translate(
            'xpack.onechat.conversation.thinking.tabularDataResultStep.seeInDiscoverAriaLabel',
            {
              defaultMessage: 'See documents in Discover',
            }
          )}
        >
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
            {i18n.translate(
              'xpack.onechat.conversation.thinking.tabularDataResultStep.foundRecordsMessage',
              {
                defaultMessage:
                  '{totalDocuments, plural, one {{totalDocuments, number} record} other {{totalDocuments, number} records}}',
                values: {
                  totalDocuments: data.values.length,
                },
              }
            )}
            <EuiIcon type="popout" />
          </EuiFlexGroup>
        </EuiLink>
      )}
    </EuiFlexGroup>
  );
};
