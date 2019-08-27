/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { CloneProgress } from '../../../model';

interface Props {
  repoName: string;
  progress: number;
  cloneProgress: CloneProgress;
}

export const CloneStatus = (props: Props) => {
  const { progress: progressRate, cloneProgress, repoName } = props;
  let progress = i18n.translate(
    'xpack.code.mainPage.content.cloneStatus.progress.receivingRateOnlyText',
    {
      defaultMessage: 'Receiving objects: {progressRate}%',
      values: { progressRate: progressRate.toFixed(2) },
    }
  );
  if (progressRate < 0) {
    progress = i18n.translate('xpack.code.mainPage.content.cloneStatus.progress.cloneFailedText', {
      defaultMessage: 'Clone Failed',
    });
  } else if (cloneProgress) {
    const { receivedObjects, totalObjects, indexedObjects } = cloneProgress;

    if (receivedObjects === totalObjects) {
      progress = i18n.translate('xpack.code.mainPage.content.cloneStatus.progress.indexingText', {
        defaultMessage: 'Indexing objects: {progressRate}% {indexedObjects}/{totalObjects}',
        values: {
          progressRate: ((indexedObjects * 100) / totalObjects).toFixed(2),
          indexedObjects,
          totalObjects,
        },
      });
    } else {
      progress = i18n.translate('xpack.code.mainPage.content.cloneStatus.progress.receivingText', {
        defaultMessage: 'Receiving objects: {progressRate}% {receivedObjects}/{totalObjects}',
        values: {
          progressRate: ((receivedObjects * 100) / totalObjects).toFixed(2),
          receivedObjects,
          totalObjects,
        },
      });
    }
  }
  return (
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiFlexItem grow={false}>
        <EuiText style={{ fontSize: theme.euiSizeXXL, color: '#1A1A1A' }}>
          {repoName}{' '}
          <FormattedMessage
            id="xpack.code.mainPage.content.cloneStatus.isCloningText"
            defaultMessage="is cloning"
          />
        </EuiText>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem grow={false}>
        <EuiText style={{ fontSize: theme.euiSizeM, color: '#69707D' }}>
          <FormattedMessage
            id="xpack.code.mainPage.content.cloneStatus.yourProjectWillBeAvailableText"
            defaultMessage="Your project will be available when this process is complete"
          />
        </EuiText>
      </EuiFlexItem>
      <EuiSpacer size="xl" />
      <EuiFlexItem grow={false}>
        <div>
          <EuiText size="m" color="subdued">
            {progress}
          </EuiText>
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 640 }}>
        <EuiProgress color="primary" size="s" max={100} value={progressRate} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
