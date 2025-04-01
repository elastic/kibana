/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageHeader, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { remoteClustersUrl } from '../../../services/documentation';

interface Props {
  title: ReactNode;
  description?: ReactNode;
}

export const RemoteClusterPageTitle: React.FC<Props> = ({ title, description }) => (
  <>
    <EuiPageHeader
      bottomBorder
      pageTitle={<span data-test-subj="remoteClusterPageTitle">{title}</span>}
      rightSideItems={[
        <EuiButtonEmpty
          size="s"
          flush="right"
          href={remoteClustersUrl}
          target="_blank"
          iconType="help"
          data-test-subj="remoteClusterDocsButton"
        >
          <FormattedMessage
            id="xpack.remoteClusters.readDocsButtonLabel"
            defaultMessage="Remote cluster docs"
          />
        </EuiButtonEmpty>,
      ]}
      description={description}
    />

    <EuiSpacer size="l" />
  </>
);
