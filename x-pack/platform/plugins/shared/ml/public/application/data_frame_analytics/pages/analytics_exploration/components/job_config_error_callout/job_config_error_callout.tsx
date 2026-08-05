/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

import { i18n } from '@kbn/i18n';

import { useMlKibana } from '../../../../../contexts/kibana';

const jobConfigErrorTitle = i18n.translate('xpack.ml.dataframe.analytics.jobConfig.errorTitle', {
  defaultMessage: 'Unable to fetch results. An error occurred loading the job configuration data.',
});

const jobCapsErrorTitle = i18n.translate('xpack.ml.dataframe.analytics.jobCaps.errorTitle', {
  defaultMessage: "Unable to fetch results. An error occurred loading the index's field data.",
});

interface Props {
  jobCapsServiceErrorMessage: string | undefined;
  jobConfigErrorMessage: string | undefined;
  title: string;
}

export const JobConfigErrorCallout: FC<Props> = ({
  jobCapsServiceErrorMessage,
  jobConfigErrorMessage,
  title,
}) => {
  const {
    services: {
      application: { getUrlForApp },
    },
  } = useMlKibana();
  const containsDataViewLink =
    typeof jobCapsServiceErrorMessage === 'string' &&
    jobCapsServiceErrorMessage.includes('locate that index-pattern') &&
    jobCapsServiceErrorMessage.includes('click here to re-create');

  const messageText = jobConfigErrorMessage ?? jobCapsServiceErrorMessage;
  const newDataViewUrl = useMemo(
    () =>
      getUrlForApp('management', {
        path: 'kibana/indexPatterns',
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <EuiPanel grow={false}>
      <EuiSpacer />
      <KbnDangerCallout
        title={jobConfigErrorMessage ? jobConfigErrorTitle : jobCapsErrorTitle}
        text={messageText}
        actionProps={
          containsDataViewLink
            ? {
                primary: {
                  href: newDataViewUrl,
                  target: '_blank',
                  children: i18n.translate(
                    'xpack.ml.dataframe.analytics.jobConfig.recreateDataViewLinkLabel',
                    { defaultMessage: 'Re-create data view' }
                  ),
                },
              }
            : undefined
        }
      />
    </EuiPanel>
  );
};
