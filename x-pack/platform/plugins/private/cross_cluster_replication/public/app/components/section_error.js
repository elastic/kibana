/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

export function SectionError(props) {
  const { title, error, ...rest } = props;
  const data = error.body ? error.body : error;
  const { error: errorString, attributes, message } = data;

  return (
    <EuiCallOut title={title} color="danger" iconType="warning" {...rest}>
      <div>{message || errorString}</div>
      {attributes?.error?.root_cause && (
        <Fragment>
          <EuiSpacer size="m" />
          <ul>
            {attributes.error.root_cause.map(({ type, reason }, i) => (
              <li key={i}>
                {type}: {reason}
              </li>
            ))}
          </ul>
        </Fragment>
      )}
    </EuiCallOut>
  );
}
