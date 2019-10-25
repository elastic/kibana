/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentProps } from 'react';
import { EuiAccordion } from '@elastic/eui';
import { Stacktrace } from '../../../shared/Stacktrace';
import { ErrorRaw } from '../../../../../typings/es_schemas/raw/ErrorRaw';

interface CauseStacktraceProps {
  codeLanguage?: string;
  exception: ErrorRaw['error']['exception'][0];
}

export function CauseStacktrace({
  codeLanguage,
  exception
}: CauseStacktraceProps) {
  return (
    <EuiAccordion
      buttonContent={`Caused by ${exception.message}`}
      id={exception.message + exception.module}
    >
      <Stacktrace
        stackframes={exception.stackframes}
        codeLanguage={codeLanguage}
      />
    </EuiAccordion>
  );
}
