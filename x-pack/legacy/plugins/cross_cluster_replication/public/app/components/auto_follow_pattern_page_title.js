/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContentHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { autoFollowPatternUrl } from '../services/documentation_links';

export const AutoFollowPatternPageTitle = ({ title }) => (
  <Fragment>
    <EuiSpacer size="xs" />

    <EuiPageContentHeader data-test-subj="pageTitle">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>{title}</h1>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={autoFollowPatternUrl}
            target="_blank"
            iconType="help"
            data-test-subj="docsButton"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.readDocsAutoFollowPatternButtonLabel"
              defaultMessage="Auto-follow pattern docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageContentHeader>
  </Fragment>
);

AutoFollowPatternPageTitle.propTypes = {
  title: PropTypes.node.isRequired,
};
