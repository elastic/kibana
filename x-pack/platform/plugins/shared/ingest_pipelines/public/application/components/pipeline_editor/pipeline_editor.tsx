/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { usePipelineProcessorsContext } from './context';
import type { OnDoneLoadJsonHandler } from './components';
import { ProcessorsEmptyPrompt, OnFailureProcessorsTitle, ProcessorsHeader } from './components';
import { ProcessorsEditor, GlobalOnFailureProcessorsEditor } from './editors';

interface Props {
  onLoadJson: OnDoneLoadJsonHandler;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    container: css`
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    `,
  };
};

export const PipelineEditor: React.FunctionComponent<Props> = ({ onLoadJson }) => {
  const {
    state: { processors: allProcessors },
  } = usePipelineProcessorsContext();

  const styles = useStyles();

  const {
    state: { processors, onFailure },
  } = allProcessors;

  const showEmptyPrompt = processors.length === 0 && onFailure.length === 0;

  let content: React.ReactNode;

  if (showEmptyPrompt) {
    content = <ProcessorsEmptyPrompt onLoadJson={onLoadJson} />;
  } else {
    content = (
      <>
        <ProcessorsEditor />

        <EuiSpacer size="s" />

        <OnFailureProcessorsTitle />

        <GlobalOnFailureProcessorsEditor />
      </>
    );
  }

  return (
    <div>
      <EuiFlexGroup gutterSize="m" responsive={false} direction="column">
        <EuiFlexItem grow={false}>
          <ProcessorsHeader onLoadJson={onLoadJson} hasProcessors={processors.length > 0} />
        </EuiFlexItem>
        <EuiFlexItem css={styles.container} grow={false}>
          {content}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
