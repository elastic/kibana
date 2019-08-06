/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import chrome from 'ui/chrome';
import { IndexPattern } from 'ui/index_patterns';

import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { CreateJobLinkCard } from '../../../components/create_job_link_card';

interface Props {
  indexPattern: IndexPattern;
}

export const ActionsPanel: FC<Props> = ({ indexPattern }) => {
  function openAdvancedJobWizard() {
    // TODO - pass the search string to the advanced job page as well as the index pattern
    //       (add in with new advanced job wizard?)
    window.open(
      `${chrome.getBasePath()}/app/ml#/jobs/new_job/advanced?index=${indexPattern}`,
      '_self'
    );
  }

  return (
    <EuiPanel data-test-subj="mlDataVisualizerActionsPanel">
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.ml.datavisualizer.actionsPanel.createJobTitle"
            defaultMessage="Create Job"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ml.datavisualizer.actionsPanel.createJobDescription"
            defaultMessage="Use the Advanced job wizard to create a job to find anomalies in this data:"
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <CreateJobLinkCard
        iconType="createAdvancedJob"
        title={i18n.translate('xpack.ml.datavisualizer.actionsPanel.advancedTitle', {
          defaultMessage: 'Advanced',
        })}
        description={i18n.translate('xpack.ml.datavisualizer.actionsPanel.advancedDescription', {
          defaultMessage:
            'Use the full range of options to create a job for more advanced use cases',
        })}
        onClick={openAdvancedJobWizard}
      />
    </EuiPanel>
  );
};
