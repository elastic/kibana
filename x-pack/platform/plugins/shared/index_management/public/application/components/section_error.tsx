/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';

export interface Error {
  cause?: string[];
  message?: string;
  statusText?: string;
  attributes?: {
    cause: string[];
  };
}

interface Props {
  title: string;
  error: Error;
}

export const SectionError: React.FunctionComponent<Props> = ({ title, error, ...rest }) => {
  const {
    cause: causeRoot, // wrapEsError() on the server adds a "cause" array
    message,
    statusText,
    attributes: { cause: causeAttributes } = {},
  } = error;

  const cause = causeAttributes ?? causeRoot;

  return (
    <EuiCallOut announceOnMount title={title} color="danger" iconType="warning" {...rest}>
      <div>{message || statusText}</div>
      {cause && (
        <>
          <EuiSpacer size="m" />
          <ul>
            {cause.map((causeMsg, i) => (
              <li key={i}>{causeMsg}</li>
            ))}
          </ul>
        </>
      )}
    </EuiCallOut>
  );
};
