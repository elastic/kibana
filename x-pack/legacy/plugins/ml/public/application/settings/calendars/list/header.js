/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for the header section of the calendars list page.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTextColor,
  EuiButtonEmpty,
} from '@elastic/eui';

import { metadata } from 'ui/metadata';

// metadata.branch corresponds to the version used in documentation links.
const docsUrl = `https://www.elastic.co/guide/en/elastic-stack-overview/${metadata.branch}/ml-calendars.html`;

export function CalendarsListHeader({ totalCount, refreshCalendars }) {
  return (
    <React.Fragment>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.ml.settings.calendars.listHeader.calendarsTitle"
                    defaultMessage="Calendars"
                  />
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTextColor color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.ml.settings.calendars.listHeader.calendarsListTotalCount"
                    defaultMessage="{totalCount} in total"
                    values={{
                      totalCount,
                    }}
                  />
                </p>
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="refresh"
                onClick={refreshCalendars}
              >
                <FormattedMessage
                  id="xpack.ml.settings.calendars.listHeader.refreshButtonLabel"
                  defaultMessage="Refresh"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m"/>
      <EuiText>
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.ml.settings.calendars.listHeader.calendarsDescription"
              defaultMessage="Calendars contain a list of scheduled events for which you do not want to generate anomalies,
              such as planned system outages or public holidays. The same calendar can be assigned to multiple jobs.{br}{learnMoreLink}"
              values={{
                br: <br />,
                learnMoreLink: (
                  <EuiLink href={docsUrl} target="_blank">
                    <FormattedMessage
                      id="xpack.ml.settings.calendars.listHeader.calendarsDescription.learnMoreLinkText"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiTextColor>
        </p>
      </EuiText>
      <EuiSpacer size="m"/>
    </React.Fragment>
  );

}
CalendarsListHeader.propTypes = {
  totalCount: PropTypes.number.isRequired,
  refreshCalendars: PropTypes.func.isRequired
};
