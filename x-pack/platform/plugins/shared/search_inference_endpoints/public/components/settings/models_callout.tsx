/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, type EuiCallOutProps, EuiSpacer } from '@elastic/eui';

export interface ModelsCalloutProps {
  title: React.ReactNode;
  message: React.ReactNode;
  modelList: React.ReactNode[];
  color?: EuiCallOutProps['color'];
  iconType?: EuiCallOutProps['iconType'];
  'data-test-subj'?: string;
}

export const ModelsCallout = ({
  title,
  message,
  modelList,
  color = 'warning',
  iconType = 'warning',
  'data-test-subj': dts,
}: ModelsCalloutProps) => {
  return (
    <>
      <EuiCallOut
        title={title}
        color={color}
        iconType={iconType}
        data-test-subj={dts}
        announceOnMount
      >
        <p>{message}</p>
        <ul>
          {modelList.map((model, i) => (
            <li key={`modelList.${i}`}>{model}</li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer size="l" />
    </>
  );
};
