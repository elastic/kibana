/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';

const calloutComponents = {
  primary: KbnInfoCallout,
  success: KbnSuccessCallout,
  warning: KbnWarningCallout,
  danger: KbnDangerCallout,
} as const;

type ModelCalloutColor = keyof typeof calloutComponents;

export interface ModelsCalloutProps {
  title: React.ReactNode;
  message: React.ReactNode;
  modelList: React.ReactNode[];
  color?: ModelCalloutColor;
  'data-test-subj'?: string;
}

export const ModelsCallout = ({
  title,
  message,
  modelList,
  color = 'warning',
  'data-test-subj': dts,
}: ModelsCalloutProps) => {
  const CalloutComponent =
    calloutComponents[color as keyof typeof calloutComponents] ?? KbnWarningCallout;
  return (
    <>
      <CalloutComponent title={title} text={message} data-test-subj={dts} announceOnMount>
        <ul>
          {modelList.map((model, i) => (
            <li key={`modelList.${i}`}>{model}</li>
          ))}
        </ul>
      </CalloutComponent>
      <EuiSpacer size="l" />
    </>
  );
};
