/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiTitle, useEuiFontSize } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from '@emotion/styled';
import { Stackframe } from '@kbn/apm-types';
import { Stacktrace } from '.';

const Accordion = styled(EuiAccordion)`
  border-top: ${({ theme }) => theme.euiTheme.border.thin};
  margin-top: ${({ theme }) => theme.euiTheme.size.s};
`;

const CausedByContainer = styled('h5')`
  padding: ${({ theme }) => theme.euiTheme.size.s} 0;
`;

const CausedByHeading = styled('span')`
  color: ${({ theme }) => theme.euiTheme.colors.textSubdued};
  display: block;
  font-size: ${() => useEuiFontSize('xs').fontSize};
  font-weight: ${({ theme }) => theme.euiTheme.font.weight.bold};
  text-transform: uppercase;
`;

const FramesContainer = styled('div')`
  padding-left: ${({ theme }) => theme.euiTheme.size.m};
`;

function CausedBy({ message }: { message: string }) {
  return (
    <CausedByContainer>
      <CausedByHeading>
        {i18n.translate('xpack.eventStacktrace.stacktraceTab.causedByFramesToogleButtonLabel', {
          defaultMessage: 'Caused By',
        })}
      </CausedByHeading>
      <EuiTitle size="xxs">
        <span>{message}</span>
      </EuiTitle>
    </CausedByContainer>
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
  if (stackframes.length === 0) {
    return <CausedBy message={message} />;
  }

  return (
    <Accordion
      buttonContent={<CausedBy message={message} />}
      id={id}
      data-test-subj="cause-stacktrace"
    >
      <FramesContainer>
        <Stacktrace stackframes={stackframes} codeLanguage={codeLanguage} />
      </FramesContainer>
    </Accordion>
  );
}
