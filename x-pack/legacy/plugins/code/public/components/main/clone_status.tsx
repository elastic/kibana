/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer, EuiText } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { CloneProgress } from '../../../model';

interface Props {
  repoName: string;
  progress: number;
  cloneProgress: CloneProgress;
}

export const CloneStatus = (props: Props) => {
  const { progress: progressRate, cloneProgress, repoName } = props;
  let progress = `Receiving objects: ${progressRate.toFixed(2)}%`;
  if (progressRate < 0) {
    progress = 'Clone Failed';
  } else if (cloneProgress) {
    const { receivedObjects, totalObjects, indexedObjects } = cloneProgress;

    if (receivedObjects === totalObjects) {
      progress = `Indexing objects: ${((indexedObjects * 100) / totalObjects).toFixed(
        2
      )}% (${indexedObjects}/${totalObjects})`;
    } else {
      progress = `Receiving objects: ${((receivedObjects * 100) / totalObjects).toFixed(
        2
      )}% (${receivedObjects}/${totalObjects})`;
    }
  }
  return (
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />
      <EuiFlexItem grow={false}>
        <EuiText style={{ fontSize: theme.euiSizeXXL, color: '#1A1A1A' }}>
          {repoName} is cloning
        </EuiText>
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem grow={false}>
        <EuiText style={{ fontSize: theme.euiSizeM, color: '#69707D' }}>
          Your project will be available when this process is complete
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
