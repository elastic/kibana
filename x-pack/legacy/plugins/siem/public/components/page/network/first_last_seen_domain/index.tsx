/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLoadingSpinner, EuiText, EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { ApolloConsumer } from 'react-apollo';
import { pure } from 'recompose';

import { useFirstLastSeenDomainQuery } from '../../../../containers/domains/first_last_seen_domain';
import { FlowTarget } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';
import { PreferenceFormattedDate } from '../../../formatted_date';
import { LocalizedDateTooltip } from '../../../localized_date_tooltip';

export type FirstLastSeenType = 'first-seen' | 'last-seen';

export interface FirstLastSeenProps {
  ip: string;
  domainName: string;
  flowTarget: FlowTarget;
  type: FirstLastSeenType;
}

export const FirstLastSeenDomain = pure<FirstLastSeenProps>(
  ({ ip, domainName, flowTarget, type }) => {
    return (
      <ApolloConsumer>
        {client => {
          const { loading, firstSeen, lastSeen, errorMessage } = useFirstLastSeenDomainQuery(
            ip,
            domainName,
            flowTarget,
            'default',
            client
          );

          if (errorMessage != null) {
            return (
              <EuiToolTip
                position="top"
                content={errorMessage}
                data-test-subj="firstLastSeenErrorToolTip"
                aria-label={`firstLastSeenError-${type}`}
                id={`firstLastSeenError-${domainName}-${type}`}
              >
                <EuiIcon
                  aria-describedby={`firstLastSeenError-${domainName}-${type}`}
                  type="alert"
                />
              </EuiToolTip>
            );
          }
          const valueSeen = type === 'first-seen' ? firstSeen : lastSeen;
          return (
            <>
              {loading && <EuiLoadingSpinner size="m" />}
              {!loading && valueSeen != null && new Date(valueSeen).toString() === 'Invalid Date'
                ? valueSeen
                : !loading &&
                  valueSeen != null && (
                    <EuiText size="s">
                      <LocalizedDateTooltip date={moment(new Date(valueSeen)).toDate()}>
                        <PreferenceFormattedDate value={new Date(valueSeen)} />
                      </LocalizedDateTooltip>
                    </EuiText>
                  )}
              {!loading && valueSeen == null && getEmptyTagValue()}
            </>
          );
        }}
      </ApolloConsumer>
    );
  }
);
