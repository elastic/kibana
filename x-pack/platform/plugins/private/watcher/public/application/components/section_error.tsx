/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnDangerCallout } from '@kbn/ui-callout';

export interface Error {
  error: string;

  /**
   * wrapEsError() on the server adds a "cause" array
   */
  cause?: string[];

  message?: string;

  /**
   * @deprecated
   */
  data: {
    error: string;
    cause?: string[];
    message?: string;
  };
}

interface Props {
  title: React.ReactNode;
  error: Error;
}

export const SectionError: React.FunctionComponent<Props> = ({ title, error, ...rest }) => {
  const data = error.data || error;

  const { error: errorString, cause, message } = data;

  return (
    <KbnDangerCallout
      title={title}
      text={<span data-test-subj="sectionErrorMessage">{message || errorString}</span>}
      {...rest}
    >
      {cause && (
        <ul>
          {cause.map((causeMsg, i) => (
            <li key={i}>{causeMsg}</li>
          ))}
        </ul>
      )}
    </KbnDangerCallout>
  );
};
