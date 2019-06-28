/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for the header section of the filter lists page.
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
const docsUrl = `https://www.elastic.co/guide/en/elastic-stack-overview/${metadata.branch}/ml-rules.html`;

export function FilterListsHeader({ totalCount, refreshFilterLists }) {
  return (
    <React.Fragment>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h1>
                  <FormattedMessage
                    id="xpack.ml.settings.filterLists.listHeader.filterListsTitle"
                    defaultMessage="Filter Lists"
                  />
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTextColor color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.ml.settings.filterLists.listHeader.filterListsDescription"
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
                onClick={() => refreshFilterLists()}
              >
                <FormattedMessage
                  id="xpack.ml.settings.filterLists.listHeader.refreshButtonLabel"
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
              id="xpack.ml.settings.filterLists.listHeader.filterListsContainsNotAllowedValuesDescription"
              defaultMessage="Filter lists contain values that you can use to include or exclude events from the machine learning analysis.
You can use the same filter list in multiple jobs.{br}{learnMoreLink}"
              values={{
                br: <br />,
                learnMoreLink: (
                  <EuiLink href={docsUrl} target="_blank">
                    <FormattedMessage
                      id="xpack.ml.settings.filterLists.listHeader.filterListsContainsNotAllowedValuesDescription.learnMoreLinkText"
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
FilterListsHeader.propTypes = {
  totalCount: PropTypes.number.isRequired,
  refreshFilterLists: PropTypes.func.isRequired
};
