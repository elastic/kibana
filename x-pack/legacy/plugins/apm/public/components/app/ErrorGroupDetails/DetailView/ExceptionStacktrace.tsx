/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTitle } from '@elastic/eui';
import { Exception } from '../../../../../typings/es_schemas/raw/ErrorRaw';
import { Stacktrace } from '../../../shared/Stacktrace';
import { CauseStacktrace } from '../../../shared/Stacktrace/CauseStacktrace';

interface ExceptionStacktraceProps {
  codeLanguage?: string;
  exceptions: Exception[];
}

export function ExceptionStacktrace({
  codeLanguage,
  exceptions
}: ExceptionStacktraceProps) {
  const title = exceptions[0]?.message;

  return (
    <>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      {exceptions.map((ex, index) => {
        return index === 0 ? (
          <Stacktrace
            key={index}
            stackframes={ex.stacktrace}
            codeLanguage={codeLanguage}
          />
        ) : (
          <CauseStacktrace
            codeLanguage={codeLanguage}
            key={index}
            id={index.toString()}
            message={ex.message}
            stackframes={ex.stacktrace}
          />
        );
      })}
    </>
  );
}
