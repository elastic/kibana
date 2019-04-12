/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { StringMap } from '../../../../typings/common';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/Agent';
import { fontSize, fontSizes, px, unit, units } from '../../../style/variables';
import { getAgentDocUrlForTab } from '../../../utils/documentation/agents';
import { NestedKeyValueTable } from './NestedKeyValueTable';
import { PropertyTabKey } from './tabConfig';

const TableContainer = styled.div`
  padding-bottom: ${px(units.double)};
`;

const TableInfo = styled.div`
  padding: ${px(unit)} 0 0;
  text-align: center;
  font-size: ${fontSize};
  color: ${theme.euiColorDarkShade};
  line-height: 1.5;
`;

const TableInfoHeader = styled(TableInfo)`
  font-size: ${fontSizes.large};
  color: ${theme.euiColorDarkestShade};
`;

const EuiIconWithSpace = styled(EuiIcon)`
  margin-right: ${px(units.half)};
`;

function getTabHelpText(tabKey: PropertyTabKey) {
  switch (tabKey) {
    case 'user':
      return i18n.translate(
        'xpack.apm.propertiesTable.userTab.agentFeatureText',
        {
          defaultMessage:
            'You can configure your agent to add contextual information about your users.'
        }
      );
    case 'labels':
      return i18n.translate(
        'xpack.apm.propertiesTable.labelsTab.agentFeatureText',
        {
          defaultMessage:
            'You can configure your agent to add filterable tags on transactions.'
        }
      );
    case 'transaction.custom':
    case 'error.custom':
      return i18n.translate(
        'xpack.apm.propertiesTable.customTab.agentFeatureText',
        {
          defaultMessage:
            'You can configure your agent to add custom contextual information on transactions.'
        }
      );
  }
}

export function TabHelpMessage({
  tabKey,
  agentName
}: {
  tabKey?: PropertyTabKey;
  agentName?: AgentName;
}) {
  if (!tabKey) {
    return null;
  }
  const docsUrl = getAgentDocUrlForTab(tabKey, agentName);
  if (!docsUrl) {
    return null;
  }

  return (
    <TableInfo>
      <EuiIconWithSpace type="iInCircle" />
      {getTabHelpText(tabKey)}{' '}
      <EuiLink target="_blank" rel="noopener" href={docsUrl}>
        {i18n.translate(
          'xpack.apm.propertiesTable.agentFeature.learnMoreLinkLabel',
          { defaultMessage: 'Learn more in the documentation.' }
        )}
      </EuiLink>
    </TableInfo>
  );
}

export function PropertiesTable({
  propData,
  propKey,
  agentName
}: {
  propData?: StringMap;
  propKey?: PropertyTabKey;
  agentName?: AgentName;
}) {
  return (
    <TableContainer>
      {propData ? (
        <NestedKeyValueTable data={propData} parentKey={propKey} depth={1} />
      ) : (
        <TableInfoHeader>
          {i18n.translate(
            'xpack.apm.propertiesTable.agentFeature.noDataAvailableLabel',
            { defaultMessage: 'No data available' }
          )}
        </TableInfoHeader>
      )}

      <TabHelpMessage tabKey={propKey} agentName={agentName} />
    </TableContainer>
  );
}
