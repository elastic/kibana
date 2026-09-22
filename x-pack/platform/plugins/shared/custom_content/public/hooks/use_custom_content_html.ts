/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiThemeColorModeStandard } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { getServices } from '../services';
import { streamGenerate } from '../utils/stream_generate';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import { fillTemplate } from '../utils/fill_template';
import {
  stripMarkdownFences,
  isValidTemplate,
  containsScript,
  prepareHtml,
} from '../utils/prepare_html';

const SCRIPT_ERROR_MESSAGE = i18n.translate('xpack.customContent.error.templateScript', {
  defaultMessage:
    'The generated panel relied on JavaScript, which this panel type does not support. Try rephrasing the request.',
});

const RENDER_ERROR_MESSAGE = i18n.translate('xpack.customContent.error.templateRender', {
  defaultMessage:
    "Couldn't render the panel. Try simplifying the request — for example, asking for one visualization at a time.",
});

export interface UseCustomContentHtmlParams {
  embeddableId: string;
  prompt: string | undefined;
  esqlQuery: string | undefined;
  timeRange: TimeRange | undefined;
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
  esqlQuery,
  timeRange,
  generationVersion,
  savedTemplate,
  colorMode,
  onTemplateChange,
}: UseCustomContentHtmlParams): UseCustomContentHtmlResult {
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(prompt));
  const [error, setError] = useState<string | undefined>();
  const [isAiUnavailable, setIsAiUnavailable] = useState(false);

  // onTemplateChange() writes back into savedTemplate, a dep of this effect. Track what we last
  // wrote so we can skip the echo re-run without also skipping intentional version bumps.
  const selfWrittenRef = useRef<string | undefined>(undefined);

  // Track the last-rendered timeRange and generationVersion so that timepicker changes and
  // explicit refresh clicks still trigger a re-fetch even when savedTemplate hasn't changed
  // (which would otherwise trip the echo-skip guard below).
  const lastRenderedTimeRangeRef = useRef<TimeRange | undefined>(undefined);
  const lastRenderedGenerationVersionRef = useRef(generationVersion);

  const colorModeRef = useRef(colorMode);
  useEffect(() => {
    colorModeRef.current = colorMode;
  }, [colorMode]);

  const onTemplateChangeRef = useRef(onTemplateChange);
  useEffect(() => {
    onTemplateChangeRef.current = onTemplateChange;
  }, [onTemplateChange]);

  useEffect(() => {
    const timeRangeSame =
      timeRange?.from === lastRenderedTimeRangeRef.current?.from &&
      timeRange?.to === lastRenderedTimeRangeRef.current?.to;
    lastRenderedTimeRangeRef.current = timeRange;

    const generationVersionSame = generationVersion === lastRenderedGenerationVersionRef.current;
    lastRenderedGenerationVersionRef.current = generationVersion;

    if (
      savedTemplate !== undefined &&
      savedTemplate === selfWrittenRef.current &&
      timeRangeSame &&
      generationVersionSame
    ) {
      return;
    }

    const template = savedTemplate;

    // Fast path — static panel with stored HTML.
    if (template && !esqlQuery) {
      setHtml(prepareHtml(template, colorModeRef.current));
      setIsLoading(false);
      setError(undefined);
      return;
    }

    const controller = new AbortController();
    let acc = '';

    const { core, search } = getServices();

    // Fast path — ES|QL panel with stored template: fetch data client-side and render, no LLM.
    if (template && esqlQuery) {
      setIsLoading(true);
      setError(undefined);
      fetchEsqlData(search, core.http, esqlQuery, timeRange, controller.signal)
        .then((response) => fillTemplate(template, response.columns, response.values ?? []))
        .then((rawHtml) => {
          if (controller.signal.aborted) return;
          setHtml(prepareHtml(rawHtml, colorModeRef.current));
          setIsLoading(false);
        })
        .catch((err: Error) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          setError(err.message || RENDER_ERROR_MESSAGE);
          setIsLoading(false);
        });

      return () => controller.abort();
    }

    if (!prompt) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(undefined);
    setIsAiUnavailable(false);

    // Slow path — LLM generates the content.
    let hasFailed = false;
    let templateDone = false;

    // Only content-quality failures (invalid/unsupported output) are worth retrying — the LLM
    // gets a concrete reason and a chance to fix it. Transport/connector/data errors are not.
    const MAX_CONTENT_RETRIES = 1;
    let retryCount = 0;

    const retryOrFail = (retryReason: string, fallbackMessage: string) => {
      if (retryCount < MAX_CONTENT_RETRIES) {
        retryCount++;
        templateDone = false;
        acc = '';
        runLlmGeneration(retryReason);
      } else {
        setError(fallbackMessage);
        setIsLoading(false);
      }
    };

    const tryFinish = async () => {
      if (!templateDone || hasFailed || controller.signal.aborted) return;

      if (esqlQuery) {
        const cleaned = stripMarkdownFences(acc);
        if (!isValidTemplate(cleaned)) {
          retryOrFail(
            'the generated template was not valid HTML',
            'Failed to generate panel: LLM returned invalid template'
          );
          return;
        }
        if (containsScript(cleaned)) {
          retryOrFail(
            'the generated template used JavaScript, which this panel type does not support',
            SCRIPT_ERROR_MESSAGE
          );
          return;
        }
        let response;
        try {
          response = await fetchEsqlData(
            search,
            core.http,
            esqlQuery,
            timeRange,
            controller.signal
          );
        } catch (err) {
          if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError'))
            return;
          setError(err instanceof Error ? err.message : RENDER_ERROR_MESSAGE);
          setIsLoading(false);
          return;
        }
        if (controller.signal.aborted) return;
        try {
          const rawHtml = await fillTemplate(cleaned, response.columns, response.values ?? []);
          if (controller.signal.aborted) return;
          selfWrittenRef.current = cleaned;
          onTemplateChangeRef.current(cleaned);
          setHtml(prepareHtml(rawHtml, colorModeRef.current));
        } catch (err) {
          if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError'))
            return;
          retryOrFail(
            `the template failed to render: ${err instanceof Error ? err.message : String(err)}`,
            RENDER_ERROR_MESSAGE
          );
          return;
        }
      } else {
        if (containsScript(acc)) {
          retryOrFail(
            'the generated HTML used JavaScript, which this panel type does not support',
            SCRIPT_ERROR_MESSAGE
          );
          return;
        }
        const rendered = prepareHtml(acc, colorModeRef.current);
        selfWrittenRef.current = rendered;
        onTemplateChangeRef.current(rendered);
        setHtml(rendered);
      }

      setIsLoading(false);
    };

    const runLlmGeneration = (retryReason?: string) => {
      const promptForLlm = retryReason
        ? `${prompt}\n\nNote: the previous attempt failed because ${retryReason}. Fix this and regenerate.`
        : prompt;

      streamGenerate(
        core.http,
        { prompt: promptForLlm, esqlQuery, timeRange, colorMode: colorModeRef.current },
        (token) => {
          acc += token;
        },
        controller.signal
      )
        .catch((err: Error & { code?: string }) => {
          if (err.name !== 'AbortError') {
            hasFailed = true;
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
          templateDone = true;
          tryFinish();
        });
    };

    runLlmGeneration();

    return () => {
      controller.abort();
    };
  }, [embeddableId, prompt, esqlQuery, timeRange, generationVersion, savedTemplate]);

  return { html, isLoading, error, isAiUnavailable };
}
