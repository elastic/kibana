/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiTitle, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Stackframe } from '@kbn/apm-types';
import { css } from '@emotion/react';
import { Stacktrace } from '.';

function CausedBy({ message }: { message: string }) {
  const { euiTheme } = useEuiTheme();

  return (
    <h5
      css={css`
        padding: ${euiTheme.size.s} 0;
      `}
    >
      <span
        css={css`
          color: ${euiTheme.colors.textSubdued};
          display: block;
          font-size: ${useEuiFontSize('xs').fontSize};
          font-weight: ${euiTheme.font.weight.bold};
          text-transform: uppercase;
        `}
      >
        {i18n.translate('xpack.eventStacktrace.stacktraceTab.causedByFramesToogleButtonLabel', {
          defaultMessage: 'Caused By',
        })}
      </span>
      <EuiTitle size="xxs">
        <span>{message}</span>
      </EuiTitle>
    </h5>
  );
}

interface CauseStacktraceProps {
  codeLanguage?: string;
  id: string;
  message?: string;
  stackframes?: Stackframe[];
}

export function CauseStacktrace({
  codeLanguage,
  id,
  message = '…',
  stackframes = [],
}: CauseStacktraceProps) {
  const { euiTheme } = useEuiTheme();

  if (stackframes.length === 0) {
    return <CausedBy message={message} />;
  }

  return (
    <EuiAccordion
      buttonContent={<CausedBy message={message} />}
      id={id}
      css={css`
        border-top: ${euiTheme.border.thin};
        margin-top: ${euiTheme.size.s};
      `}
    >
      <div
        css={css`
          padding-left: ${euiTheme.size.m};
        `}
      >
        <Stacktrace stackframes={stackframes} codeLanguage={codeLanguage} />
      </div>
    </EuiAccordion>
  );
}
