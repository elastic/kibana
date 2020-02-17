/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiTitle, EuiFlexGroup } from '@elastic/eui';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';
import { CreateJobLinkCard } from '../../../../components/create_job_link_card';
import { DataRecognizer } from '../../../../components/data_recognizer';

interface Props {
  indexPattern: IndexPattern;
}

export const ActionsPanel: FC<Props> = ({ indexPattern }) => {
  const [recognizerResultsCount, setRecognizerResultsCount] = useState(0);

  const recognizerResults = {
    count: 0,
    onChange() {
      setRecognizerResultsCount(recognizerResults.count);
    },
  };

  function openAdvancedJobWizard() {
    // TODO - pass the search string to the advanced job page as well as the index pattern
    //       (add in with new advanced job wizard?)
    window.open(`#/jobs/new_job/advanced?index=${indexPattern}`, '_self');
  }

  // Note we use display:none for the DataRecognizer section as it needs to be
  // passed the recognizerResults object, and then run the recognizer check which
  // controls whether the recognizer section is ultimately displayed.
  return (
    <div data-test-subj="mlDataVisualizerActionsPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.ml.datavisualizer.actionsPanel.createJobTitle"
            defaultMessage="Create Job"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div style={recognizerResultsCount === 0 ? { display: 'none' } : {}}>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ml.datavisualizer.actionsPanel.selectKnownConfigurationDescription"
              defaultMessage="Select known configurations for recognized data:"
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="l" responsive={true} wrap={true}>
          <DataRecognizer
            indexPattern={indexPattern}
            savedSearch={null}
            results={recognizerResults}
          />
        </EuiFlexGroup>
        <EuiSpacer size="l" />
      </div>
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.ml.datavisualizer.actionsPanel.createJobDescription"
            defaultMessage="Use the Advanced job wizard to create a job to find anomalies in this data:"
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <CreateJobLinkCard
        icon="createAdvancedJob"
        title={i18n.translate('xpack.ml.datavisualizer.actionsPanel.advancedTitle', {
          defaultMessage: 'Advanced',
        })}
        description={i18n.translate('xpack.ml.datavisualizer.actionsPanel.advancedDescription', {
          defaultMessage:
            'Use the full range of options to create a job for more advanced use cases',
        })}
        onClick={openAdvancedJobWizard}
        href={`#/jobs/new_job/advanced?index=${indexPattern}`}
        data-test-subj="mlDataVisualizerCreateAdvancedJobCard"
      />
    </div>
  );
};
