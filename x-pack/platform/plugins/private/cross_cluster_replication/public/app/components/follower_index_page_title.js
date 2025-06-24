/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiSpacer, EuiPageHeader, EuiButtonEmpty } from '@elastic/eui';

import { documentationLinks } from '../services/documentation_links';

export const FollowerIndexPageTitle = ({ title }) => (
  <>
    <EuiPageHeader
      bottomBorder
      pageTitle={<span data-test-subj="pageTitle">{title}</span>}
      rightSideItems={[
        <EuiButtonEmpty
          size="s"
          flush="right"
          href={documentationLinks.apis.createFollower}
          target="_blank"
          iconType="help"
          data-test-subj="docsButton"
        >
          <FormattedMessage
            id="xpack.crossClusterReplication.readDocsFollowerIndexButtonLabel"
            defaultMessage="Follower index docs"
          />
        </EuiButtonEmpty>,
      ]}
    />

    <EuiSpacer size="l" />
  </>
);

FollowerIndexPageTitle.propTypes = {
  title: PropTypes.node.isRequired,
};
