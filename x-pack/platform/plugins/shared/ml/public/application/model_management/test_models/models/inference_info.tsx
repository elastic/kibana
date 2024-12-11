/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiSpacer, EuiCallOut, EuiText } from '@elastic/eui';

interface Props {
  taskLabel: string;
  info: string[];
}

export const getInferenceInfoComponent = (taskLabel: string, info: string[]) => (
  <InferenceInfo taskLabel={taskLabel} info={info} />
);

const InferenceInfo: FC<Props> = ({ taskLabel, info }) => {
  if (info.length === 0) {
    return null;
  }
  return (
    <>
      <EuiCallOut title={taskLabel}>
        {info.map((i) => (
          <EuiText size="s">{i}</EuiText>
        ))}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
