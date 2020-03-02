/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { asDuration } from '../../../../utils/formatters';

const Panel = styled(EuiPanel)`
  background-color: ${lightTheme.euiColorDarkestShade};
  color: ${lightTheme.euiColorMediumShade};
`;

const List = styled('ul')``;

const Item = styled('li')`
  display: inline;
  border-right: 1px solid;
  padding-left: ${lightTheme.gutterTypes.gutterSmall};
  padding-right: ${lightTheme.gutterTypes.gutterSmall};

  &:first-child {
    padding-left: 0;
  }

  &:last-child {
    border-right: none;
    padding-right: 0;
  }
`;

const Value = styled('span')`
  color: ${lightTheme.euiColorLightestShade};
`;

interface ContentsProps {
  avgResponseTime?: number;
  callsPerMin?: number;
}

export function Contents({ avgResponseTime, callsPerMin }: ContentsProps) {
  return (
    <Panel grow={false} paddingSize="m">
      <List>
        <Item>
          {i18n.translate(
            'xpack.apm.serviceMap.edgeInfoPanel.avgResponseTimeLabel',
            {
              defaultMessage: 'Avg. response time'
            }
          )}{' '}
          <Value>{asDuration(avgResponseTime)}</Value>
        </Item>
        <Item>
          {i18n.translate(
            'xpack.apm.serviceMap.edgeInfoPanel.callsPerMinLabel',
            {
              defaultMessage: 'Calls per min.'
            }
          )}{' '}
          <Value>
            {i18n.translate(
              'xpack.apm.serviceMap.edgeInfoPanel.callsPerMinValue',
              {
                values: { callsPerMin: callsPerMin?.toFixed(1) },
                defaultMessage: '{callsPerMin} calls'
              }
            )}
          </Value>
        </Item>
      </List>
    </Panel>
  );
}
