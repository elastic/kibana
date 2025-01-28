/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AddToTimelineButton } from '../../timelines/add_to_timeline_button';
import { AddToCaseWrapper } from '../../cases/add_to_cases';

interface PackResultsHeadersProps {
  actionId?: string;
  queryIds: string[];
  agentIds?: string[];
}

const resultsHeadingCss = ({ euiTheme }: UseEuiTheme) => ({
  paddingRight: '20px',
  borderRight: euiTheme.border.thick,
});

const iconsListCss = {
  alignContent: 'center',
  justifyContent: 'center',
  paddingLeft: '10px',
};

export const PackResultsHeader = React.memo<PackResultsHeadersProps>(
  ({ actionId, agentIds, queryIds }) => {
    const iconProps = useMemo(() => ({ color: 'text', size: 'xs', iconSize: 'l' }), []);

    return (
      <>
        <EuiSpacer size={'l'} />
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem css={resultsHeadingCss} grow={false}>
            <EuiText>
              <h2>
                <FormattedMessage
                  id="xpack.osquery.liveQueryActionResults.results"
                  defaultMessage="Results"
                />
              </h2>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem css={iconsListCss} grow={false}>
            <span>
              {actionId && (
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <AddToCaseWrapper
                      actionId={actionId}
                      agentIds={agentIds}
                      isIcon={true}
                      iconProps={iconProps}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <AddToTimelineButton
                      field="action_id"
                      value={queryIds}
                      isIcon={true}
                      iconProps={iconProps}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size={'l'} />
      </>
    );
  }
);

PackResultsHeader.displayName = 'PackResultsHeader';
