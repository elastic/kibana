/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { idx } from '@kbn/elastic-idx/target';
import { ErrorRaw } from '../../../../../typings/es_schemas/raw/ErrorRaw';
import { Stacktrace } from '../../../shared/Stacktrace';
import { CauseStacktrace } from './CauseStacktrace';

interface ExceptionStacktraceProps {
  codeLanguage?: string;
  exception: ErrorRaw['error']['exception'];
}

export function ExceptionStacktrace({
  codeLanguage,
  exception
}: ExceptionStacktraceProps) {
  const title = idx(exception, _ => _[0].message);

  return (
    <>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer size="l" />
      {(exception || []).map((ex, index) => {
        return index === 0 ? (
          <Stacktrace
            key={index}
            stackframes={ex.stacktrace}
            codeLanguage={codeLanguage}
          />
        ) : (
          <CauseStacktrace
            key={index}
            exception={ex}
            codeLanguage={codeLanguage}
          />
        );
      })}
    </>
  );
}
