/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from '@emotion/styled';
import { Stackframe } from '@kbn/apm-types';
import { Stackframe as StackframeComponent } from './stackframe';

const LibraryStacktraceAccordion = styled(EuiAccordion)`
  margin: ${({ theme }) => theme.euiTheme.size.xs} 0;
`;

interface Props {
  codeLanguage?: string;
  stackframes: Stackframe[];
  id: string;
}

export function LibraryStacktrace({ codeLanguage, id, stackframes }: Props) {
  if (stackframes.length === 0) {
    return null;
  }

  return (
    <LibraryStacktraceAccordion
      buttonContent={i18n.translate(
        'xpack.eventStacktrace.stacktraceTab.libraryFramesToogleButtonLabel',
        {
          defaultMessage: '{count, plural, one {# library frame} other {# library frames}}',
          values: { count: stackframes.length },
        }
      )}
      data-test-subj="LibraryStacktraceAccordion"
      id={id}
    >
      {stackframes.map((stackframe, i) => (
        <StackframeComponent
          key={i}
          id={i.toString(10)}
          isLibraryFrame
          codeLanguage={codeLanguage}
          stackframe={stackframe}
        />
      ))}
    </LibraryStacktraceAccordion>
  );
}
