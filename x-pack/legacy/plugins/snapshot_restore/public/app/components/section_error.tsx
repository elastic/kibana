/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';

export interface Error {
  data: {
    error: string;
    cause?: string[];
    message?: string;
  };
}

interface Props {
  title: React.ReactNode;
  error: Error;
  actions?: JSX.Element;
}

export const SectionError: React.FunctionComponent<Props> = ({
  title,
  error,
  actions,
  ...rest
}) => {
  const {
    error: errorString,
    cause, // wrapEsError() on the server adds a "cause" array
    message,
  } = error.data;

  return (
    <EuiCallOut title={title} color="danger" iconType="alert" {...rest}>
      {cause ? message || errorString : <p>{message || errorString}</p>}
      {cause && (
        <Fragment>
          <EuiSpacer size="s" />
          <ul>
            {cause.map((causeMsg, i) => (
              <li key={i}>{causeMsg}</li>
            ))}
          </ul>
        </Fragment>
      )}
      {actions ? actions : null}
    </EuiCallOut>
  );
};
