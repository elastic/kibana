/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, type ReactNode } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { CcrApiError } from '../services/http_error';
import { getErrorBody, isHttpFetchError } from '../services/http_error';

interface Props {
  title: ReactNode;
  error: CcrApiError | { message?: ReactNode; error?: string };
  'data-test-subj'?: string;
}

export function SectionError({ title, error, ...rest }: Props) {
  const errorBody =
    error instanceof Error && isHttpFetchError(error) ? getErrorBody(error) : undefined;
  const message: ReactNode | undefined = errorBody?.message ?? error.message;
  const errorString: string | undefined =
    error instanceof Error || errorBody ? undefined : error.error;

  const attributes = errorBody?.attributes;

  const getRootCauses = (): Array<{ type: string; reason: string }> | undefined => {
    if (attributes == null || typeof attributes !== 'object') {
      return;
    }

    const attributesError = Reflect.get(attributes, 'error');
    if (attributesError == null || typeof attributesError !== 'object') {
      return;
    }

    const rootCause = Reflect.get(attributesError, 'root_cause');
    if (!Array.isArray(rootCause)) {
      return;
    }

    const result: Array<{ type: string; reason: string }> = [];
    for (const item of rootCause) {
      if (item == null || typeof item !== 'object') {
        continue;
      }

      const type = Reflect.get(item, 'type');
      const reason = Reflect.get(item, 'reason');
      if (typeof type === 'string' && typeof reason === 'string') {
        result.push({ type, reason });
      }
    }

    return result.length ? result : undefined;
  };

  const rootCauses = getRootCauses();

  return (
    <EuiCallOut title={title} color="danger" iconType="warning" {...rest}>
      <div>{message || errorString}</div>
      {rootCauses && (
        <Fragment>
          <EuiSpacer size="m" />
          <ul>
            {rootCauses.map(({ type, reason }, i) => (
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
