/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
<<<<<<< HEAD:x-pack/examples/gen_ai_streaming_response_example/public/components/streaming_response.tsx
  EuiAccordion,
=======
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
>>>>>>> whats-new:x-pack/plugins/observability/public/components/co_pilot_prompt/co_pilot_prompt.tsx
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
<<<<<<< HEAD:x-pack/examples/gen_ai_streaming_response_example/public/components/streaming_response.tsx
import { css } from '@emotion/react';
import { CoreStart } from '@kbn/core/public';
import { useFetchStream } from '@kbn/ml-response-stream/client';
=======
import { TechnicalPreviewBadge } from '@kbn/observability-shared-plugin/public';
import type { ChatCompletionRequestMessage } from 'openai';
import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { catchError, Observable, of } from 'rxjs';
import { CoPilotPromptId } from '../../../common';
import type { PromptParamsOf } from '../../../common/co_pilot';
import type { CoPilotService, PromptObservableState } from '../../typings/co_pilot';
import { CoPilotPromptFeedback } from './co_pilot_prompt_feedback';
>>>>>>> whats-new:x-pack/plugins/observability/public/components/co_pilot_prompt/co_pilot_prompt.tsx

export interface StreamingResponseProps {
  http: CoreStart['http'];
  prompt: string;
  selectedConnectorId: string;
  initialIsOpen?: boolean;
}
interface ChunkChoice {
  index: 0;
  delta: { role: string; content: string };
  finish_reason: null | string;
}

interface Chunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChunkChoice[];
}

const cursorCss = `
  @keyframes blink {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  animation: blink 1s infinite;
  width: 10px;
  height: 16px;
  vertical-align: middle;
  display: inline-block;
  background: rgba(0, 0, 0, 0.25);
`;

<<<<<<< HEAD:x-pack/examples/gen_ai_streaming_response_example/public/components/streaming_response.tsx
export const StreamingResponse = ({
  http,
  prompt,
  selectedConnectorId,
  initialIsOpen = false,
}: StreamingResponseProps) => {
  const { euiTheme } = useEuiTheme();
  const [hasOpened, setHasOpened] = useState(initialIsOpen);

  const { errors, start, cancel, data, isRunning } = useFetchStream(
    http,
    `/internal/examples/execute_gen_ai_connector`,
    undefined,
    {
      connector_id: selectedConnectorId,
      prompt,
    },
    { reducer: streamReducer, initialState: '' }
  );
=======
export interface CoPilotPromptProps<TPromptId extends CoPilotPromptId> {
  title: string;
  promptId: TPromptId;
  coPilot: CoPilotService;
  params: PromptParamsOf<TPromptId>;
  feedbackEnabled: boolean;
}

// eslint-disable-next-line import/no-default-export
export default function CoPilotPrompt<TPromptId extends CoPilotPromptId>({
  title,
  coPilot,
  promptId,
  params,
  feedbackEnabled,
}: CoPilotPromptProps<TPromptId>) {
  const [hasOpened, setHasOpened] = useState(false);
>>>>>>> whats-new:x-pack/plugins/observability/public/components/co_pilot_prompt/co_pilot_prompt.tsx

  // Start fetching when the accordion was opened
  useEffect(() => {
    if (hasOpened && !isRunning && errors.length === 0 && data === '') {
      start();
    }
  }, [data, errors, hasOpened, isRunning, start]);

<<<<<<< HEAD:x-pack/examples/gen_ai_streaming_response_example/public/components/streaming_response.tsx
  // Cancel fetching when the component unmounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => cancel, []);

  let content = data;
=======
  const [responseTime, setResponseTime] = useState<number | undefined>(undefined);

  const conversation$ = useMemo(() => {
    if (hasOpened) {
      setResponseTime(undefined);

      const now = Date.now();

      const observable = coPilot.prompt(promptId, params).pipe(
        catchError((err) =>
          of({
            messages: [] as ChatCompletionRequestMessage[],
            loading: false,
            error: err,
            message: String(err.message),
          })
        )
      );

      observable.subscribe({
        complete: () => {
          setResponseTime(Date.now() - now);
        },
      });

      return observable;
    }

    return new Observable<PromptObservableState & { error?: any }>(() => {});
  }, [params, promptId, coPilot, hasOpened, setResponseTime]);

  const conversation = useObservable(conversation$);

  const content = conversation?.message ?? '';
  const messages = conversation?.messages;
>>>>>>> whats-new:x-pack/plugins/observability/public/components/co_pilot_prompt/co_pilot_prompt.tsx

  let state: 'init' | 'loading' | 'streaming' | 'error' | 'complete' = 'init';

  if (isRunning) {
    state = content ? 'streaming' : 'loading';
  } else if (errors.length > 0) {
    state = 'error';
    content = errors.join('\n');
  } else if (content) {
    state = 'complete';
  }

  let inner: React.ReactElement;

  if (state === 'complete' || state === 'streaming') {
    inner = (
      <>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {content}
          {state === 'streaming' ? <span className={cursorCss} /> : undefined}
        </p>
        {state === 'complete' ? (
          <>
            <EuiSpacer size="m" />
            {coPilot.isTrackingEnabled() && feedbackEnabled ? (
              <CoPilotPromptFeedback
                messages={messages}
                response={content}
                responseTime={responseTime!}
                promptId={promptId}
                coPilot={coPilot}
              />
            ) : undefined}
          </>
        ) : undefined}
      </>
    );
  } else if (state === 'init' || state === 'loading') {
    inner = (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {i18n.translate('xpack.observability.coPilotPrompt.chatLoading', {
              defaultMessage: 'Waiting for a response...',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  } else {
    inner = (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon color="danger" type="warning" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{content}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiPanel color="primary">
      <EuiAccordion
        id={`streamingResponse`}
        css={css`
          .euiButtonIcon {
            color: ${euiTheme.colors.primaryText};
          }
        `}
        buttonContent={
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem grow>
<<<<<<< HEAD:x-pack/examples/gen_ai_streaming_response_example/public/components/streaming_response.tsx
              <EuiText size="m" color={euiTheme.colors.primaryText}>
                <strong>
                  {i18n.translate(
                    'genAiStreamingResponseExample.app.component.streamingResponseTitle',
                    {
                      defaultMessage: 'Stream Response',
                    }
                  )}
                </strong>
              </EuiText>
            </EuiFlexItem>
=======
              <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiText size="m" color={theme.euiTheme.colors.primaryText}>
                    <strong>{title}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color={theme.euiTheme.colors.primaryText}>
                    {i18n.translate('xpack.observability.coPilotChatPrompt.subtitle', {
                      defaultMessage: 'Get helpful insights from our Elastic AI Assistant',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TechnicalPreviewBadge />
            </EuiFlexItem>
>>>>>>> whats-new:x-pack/plugins/observability/public/components/co_pilot_prompt/co_pilot_prompt.tsx
          </EuiFlexGroup>
        }
        initialIsOpen={initialIsOpen}
        onToggle={() => {
          setHasOpened(true);
        }}
      >
        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="m" />
        {inner}
      </EuiAccordion>
    </EuiPanel>
  );
};

function streamReducer(state: string, action: Chunk | Chunk[]) {
  return `${state}${[action]
    .flat()
    .map((chunk) => chunk.choices[0]?.delta.content ?? '')
    .join('')}`;
}
