/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { CoreStart } from '@kbn/core/public';
import { concatMap, delay, Observable, of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

export interface StreamingResponseProps {
  http: CoreStart['http'];
  prompt: string;
  selectedConnectorId: string;
}

export interface PromptObservableState {
  chunks: Chunk[];
  message?: string;
  error?: string;
  loading: boolean;
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

export const StreamingResponse = ({
  http,
  prompt,
  selectedConnectorId,
}: StreamingResponseProps) => {
  const { euiTheme } = useEuiTheme();
  const [hasOpened, setHasOpened] = useState(false);

  const response$ = useMemo(() => {
    return hasOpened
      ? new Observable<PromptObservableState>((observer) => {
          observer.next({ chunks: [], loading: true });

          http
            .post(`/internal/examples/execute_gen_ai_connector`, {
              body: JSON.stringify({
                connector_id: selectedConnectorId,
                prompt,
              }),
              asResponse: true,
              rawResponse: true,
            })
            .then((response) => {
              const status = response.response?.status;

              if (!status || status >= 400) {
                throw new Error(response.response?.statusText || 'Unexpected error');
              }

              const reader = response.response.body?.getReader();

              if (!reader) {
                throw new Error('Could not get reader from response');
              }

              const decoder = new TextDecoder();

              const chunks: Chunk[] = [];

              let prev: string = '';

              function read() {
                reader!.read().then(({ done, value }: { done: boolean; value?: Uint8Array }) => {
                  try {
                    if (done) {
                      observer.next({
                        chunks,
                        message: getMessageFromChunks(chunks),
                        loading: false,
                      });
                      observer.complete();
                      return;
                    }

                    let lines: string[] = (prev + decoder.decode(value)).split('\n');

                    const lastLine: string = lines[lines.length - 1];

                    const isPartialChunk: boolean = !!lastLine && lastLine !== 'data: [DONE]';

                    if (isPartialChunk) {
                      prev = lastLine;
                      lines.pop();
                    } else {
                      prev = '';
                    }

                    lines = lines
                      .map((str) => str.substr(6))
                      .filter((str) => !!str && str !== '[DONE]');

                    const nextChunks: Chunk[] = lines.map((line) => JSON.parse(line));

                    nextChunks.forEach((chunk) => {
                      chunks.push(chunk);
                      observer.next({
                        chunks,
                        message: getMessageFromChunks(chunks),
                        loading: true,
                      });
                    });
                  } catch (err) {
                    observer.error(err);
                    return;
                  }
                  read();
                });
              }

              read();

              return () => {
                reader.cancel();
              };
            })
            .catch((err) => {
              observer.next({ chunks: [], error: err.message, loading: false });
            });
        }).pipe(concatMap((value) => of(value).pipe(delay(50))))
      : new Observable<PromptObservableState>(() => {});
  }, [http, hasOpened, prompt, selectedConnectorId]);

  const response = useObservable(response$);

  useEffect(() => {}, [response$]);

  let content = response?.message ?? '';

  let state: 'init' | 'loading' | 'streaming' | 'error' | 'complete' = 'init';

  if (response?.loading) {
    state = content ? 'streaming' : 'loading';
  } else if (response && 'error' in response && response.error) {
    state = 'error';
    content = response.error;
  } else if (content) {
    state = 'complete';
  }

  let inner: React.ReactElement;

  if (state === 'complete' || state === 'streaming') {
    inner = (
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
        {content}
        {state === 'streaming' ? <span className={cursorCss} /> : <></>}
      </p>
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
          </EuiFlexGroup>
        }
        initialIsOpen={false}
        onToggle={() => {
          setHasOpened(true);
        }}
      >
        <EuiSpacer size="s" />
        {inner}
      </EuiAccordion>
    </EuiPanel>
  );
};

function getMessageFromChunks(chunks: Chunk[]) {
  let message = '';
  chunks.forEach((chunk) => {
    message += chunk.choices[0]?.delta.content ?? '';
  });
  return message;
}
