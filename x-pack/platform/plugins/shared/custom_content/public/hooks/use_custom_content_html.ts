/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiThemeColorModeStandard } from '@elastic/eui';
import { getServices } from '../services';
import { streamGenerate } from '../utils/stream_generate';
import { stripMarkdownFences, containsScript, prepareHtml } from '../utils/template_fill';

const SCRIPT_ERROR_MESSAGE = i18n.translate('xpack.customContent.error.templateScript', {
  defaultMessage:
    'The generated panel relied on JavaScript, which this panel type does not support. Try rephrasing the request.',
});

export interface UseCustomContentHtmlParams {
  embeddableId: string;
  prompt: string | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  colorMode: EuiThemeColorModeStandard;
  onTemplateChange: (template: string) => void;
}

export interface UseCustomContentHtmlResult {
  html: string;
  isLoading: boolean;
  error: string | undefined;
  isAiUnavailable: boolean;
}

export function useCustomContentHtml({
  embeddableId,
  prompt,
  generationVersion,
  savedTemplate,
  colorMode,
  onTemplateChange,
}: UseCustomContentHtmlParams): UseCustomContentHtmlResult {
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(prompt));
  const [error, setError] = useState<string | undefined>();
  const [isAiUnavailable, setIsAiUnavailable] = useState(false);

  // Tracks whether the panel already has rendered HTML so the streaming interval
  // is skipped when re-generating — avoids a flash of partial content over existing output.
  const renderedHtmlRef = useRef('');
  renderedHtmlRef.current = html;

  // onTemplateChange() writes back into savedTemplate, a dep of this effect. Track what we last
  // wrote so we can skip the echo re-run without also skipping intentional version bumps.
  const selfWrittenTemplateRef = useRef<string | undefined>(undefined);

  const onTemplateChangeRef = useRef(onTemplateChange);
  useEffect(() => {
    onTemplateChangeRef.current = onTemplateChange;
  }, [onTemplateChange]);

  useEffect(() => {
    if (savedTemplate !== undefined && savedTemplate === selfWrittenTemplateRef.current) {
      return;
    }

    const template = savedTemplate;

    if (template) {
      setHtml(prepareHtml(template));
      setIsLoading(false);
      setError(undefined);
      return;
    }

    if (!prompt) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let acc = '';

    setIsLoading(true);
    setError(undefined);
    setIsAiUnavailable(false);

    const { core } = getServices();

    let hasFailed = false;

    let intervalRef: ReturnType<typeof setInterval> | undefined;
    const stopInterval = () => {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = undefined;
      }
    };

    if (!renderedHtmlRef.current) {
      intervalRef = setInterval(() => {
        if (acc) setHtml(prepareHtml(acc));
      }, 300);
    }

    streamGenerate(
      core.http,
      { prompt, colorMode },
      (token) => {
        acc += token;
      },
      controller.signal
    )
      .catch((err: Error & { code?: string }) => {
        if (err.name !== 'AbortError') {
          hasFailed = true;
          stopInterval();
          if (err.code === 'no_connector') {
            setIsAiUnavailable(true);
          } else {
            setError(err instanceof Error ? err.message : String(err));
          }
          setIsLoading(false);
        }
      })
      .finally(() => {
        if (hasFailed || controller.signal.aborted) return;
        stopInterval();

        const raw = stripMarkdownFences(acc);

        if (containsScript(raw)) {
          setError(SCRIPT_ERROR_MESSAGE);
          setIsLoading(false);
          return;
        }

        const rendered = prepareHtml(raw);
        selfWrittenTemplateRef.current = rendered;
        onTemplateChangeRef.current(rendered);
        setHtml(rendered);
        setIsLoading(false);
      });

    return () => {
      stopInterval();
      controller.abort();
    };
  }, [embeddableId, prompt, generationVersion, savedTemplate, colorMode]);

  return { html, isLoading, error, isAiUnavailable };
}
