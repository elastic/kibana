/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiCallOut } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibanaContextForPlugin } from '../../utils';

export const FailureStoreWarning = () => {
  const { services } = useKibanaContextForPlugin();

  const noAccessToFailureStoreWarningDescription = (
    <FormattedMessage
      id="xpack.datasetQuality.noAccessToFailureStore.description"
      defaultMessage="{description}"
      values={{
        description: (
          <FormattedMessage
            id="xpack.datasetQuality.noAccessToFailureStore.warning"
            defaultMessage="Documents that fail to be ingested are sent to the failure store. You don't have the required privileges to access failure stores. Contact your administrator. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink
                  external
                  target="_blank"
                  data-test-subj="datasetQualityNoAccessToFailureStoreLink"
                  href={services.docLinks.links.datasetQuality.failureStore}
                >
                  {i18n.translate('xpack.datasetQuality.noAccessToFailureStore.link.title', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              ),
            }}
          />
        ),
      }}
    />
  );

  return (
    <EuiCallOut
      title={noAccessToFailureStoreWarningDescription}
      color="warning"
      iconType="warning"
    />
  );
};
