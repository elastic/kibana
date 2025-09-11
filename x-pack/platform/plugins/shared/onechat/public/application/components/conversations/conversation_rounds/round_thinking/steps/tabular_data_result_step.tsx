/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { i18n } from '@kbn/i18n';
import type { TabularDataResult } from '@kbn/onechat-common/tools/tool_result';
import { useOnechatServices } from '../../../../../hooks/use_onechat_service';

interface TabularDataResultStepProps {
  result: TabularDataResult;
}

export const TabularDataResultStep: React.FC<TabularDataResultStepProps> = ({
  result: { data },
}) => {
  const { startDependencies } = useOnechatServices();

  const locators = startDependencies.share.url.locators;
  const { query: esqlQuery } = data;

  const discoverUrl = useMemo(() => {
    if (!esqlQuery) return undefined;
    return locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
      query: { esql: esqlQuery },
    });
  }, [locators, esqlQuery]);

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiText size="s">
        {i18n.translate(
          'xpack.onechat.conversation.thinking.tabularDataResultStep.foundDocumentsMessage',
          {
            defaultMessage: 'Found {totalDocuments} documents. ',
            values: {
              totalDocuments: data.values.length,
            },
          }
        )}
      </EuiText>
      <EuiLink
        href={discoverUrl}
        aria-label={i18n.translate(
          'xpack.onechat.conversation.thinking.tabularDataResultStep.seeInDiscoverAriaLabel',
          {
            defaultMessage: 'See documents in Discover',
          }
        )}
      >
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiIcon type="discoverApp" />
          {i18n.translate(
            'xpack.onechat.conversation.thinking.tabularDataResultStep.seeInDiscover',
            {
              defaultMessage: 'See in Discover',
              values: {
                totalDocuments: data.columns.length,
              },
            }
          )}
        </EuiFlexGroup>
      </EuiLink>
    </EuiFlexGroup>
  );
};
