/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { getServices } from '../services';
import { streamGenerate } from '../utils/stream_generate';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import type { EsqlDataResult } from '../utils/fetch_esql_data';
import {
  fillTemplate,
  stripMarkdownFences,
  isValidTemplate,
  containsScript,
  prepareHtml,
} from '../utils/template_fill';

const SCRIPT_ERROR_MESSAGE = i18n.translate('xpack.aiPanel.error.templateScript', {
  defaultMessage:
    'The generated panel relied on JavaScript, which this panel type does not support. Try rephrasing the request.',
});

export interface UseAiPanelHtmlParams {
  embeddableId: string;
  prompt: string;
  esqlQuery: string | undefined;
  timeRange: { from: string; to: string } | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  colorMode: 'LIGHT' | 'DARK';
  onTemplateChange: (template: string) => void;
}

export interface UseAiPanelHtmlResult {
  html: string;
  isLoading: boolean;
  error: string | undefined;
  isAiUnavailable: boolean;
}

export function useAiPanelHtml({
  embeddableId,
  prompt,
  esqlQuery,
  timeRange,
  generationVersion,
  savedTemplate,
  colorMode,
  onTemplateChange,
}: UseAiPanelHtmlParams): UseAiPanelHtmlResult {
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(prompt));
  const [error, setError] = useState<string | undefined>();
  const [isAiUnavailable, setIsAiUnavailable] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef('');
  const htmlRef = useRef('');
  htmlRef.current = html;

  // onTemplateChange() below writes back into savedTemplate, a dependency of this effect, which
  // would otherwise re-fire itself; a count (not a boolean) survives overlapping self-writes.
  const selfWriteCountRef = useRef(0);
  const acknowledgedWriteCountRef = useRef(0);

  const onTemplateChangeRef = useRef(onTemplateChange);
  useEffect(() => {
    onTemplateChangeRef.current = onTemplateChange;
  }, [onTemplateChange]);

  useEffect(() => {
    if (selfWriteCountRef.current > acknowledgedWriteCountRef.current) {
      acknowledgedWriteCountRef.current = selfWriteCountRef.current;
      return;
    }

    if (!prompt) {
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    accRef.current = '';

    const template = savedTemplate;

    // Fast path — static panel with stored HTML.
    if (template && !esqlQuery) {
      setHtml(prepareHtml(template));
      setIsLoading(false);
      setError(undefined);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    const { search, core } = getServices();

    // Fast path — esqlQuery panel with stored template: run query only, no LLM.
    if (template && esqlQuery) {
      fetchEsqlData(search, core.http, esqlQuery, timeRange, controller.signal)
        .then(({ columns, values }) => {
          if (controller.signal.aborted) return;
          try {
            setHtml(fillTemplate(template, columns, values ?? []));
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[ai_panel] failed to render template', err);
            setError(
              i18n.translate('xpack.aiPanel.error.templateRender', {
                defaultMessage:
                  "Couldn't render the panel. Try simplifying the request — for example, asking for one visualization at a time.",
              })
            );
          }
          setIsLoading(false);
        })
        .catch((err: Error) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          setError(err.message || 'Failed to fetch data');
          setIsLoading(false);
        });

      return () => controller.abort();
    }

    // Slow path — LLM generates template; for esqlQuery panels data fetch runs in parallel.
    let esqlData: EsqlDataResult | null = null;
    let templateDone = false;
    let dataDone = !esqlQuery;
    let hasFailed = false;

    // Only content-quality failures (invalid/unsupported output) are worth retrying — the LLM
    // gets a concrete reason and a chance to fix it. Transport/connector/data errors are not,
    // since regenerating the same content wouldn't address them.
    const MAX_CONTENT_RETRIES = 1;
    let retryCount = 0;

    let intervalRef: ReturnType<typeof setInterval> | undefined;
    const stopInterval = () => {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = undefined;
      }
    };

    // Stream partial HTML into the iframe for static panels.
    if (!htmlRef.current && !esqlQuery) {
      intervalRef = setInterval(() => {
        if (accRef.current) setHtml(prepareHtml(accRef.current));
      }, 300);
    }

    const retryOrFail = (retryReason: string, fallbackMessage: string) => {
      if (retryCount < MAX_CONTENT_RETRIES) {
        retryCount++;
        templateDone = false;
        accRef.current = '';
        runLlmGeneration(retryReason);
      } else {
        setError(fallbackMessage);
        setIsLoading(false);
      }
    };

    const tryFinish = () => {
      if (!templateDone || !dataDone || hasFailed || controller.signal.aborted) return;
      stopInterval();

      let rendered: string;

      if (esqlQuery && esqlData) {
        const cleaned = stripMarkdownFences(accRef.current);
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
        try {
          rendered = fillTemplate(cleaned, esqlData.columns, esqlData.values ?? []);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[ai_panel] failed to render template', err);
          retryOrFail(
            `the template failed to render: ${err instanceof Error ? err.message : String(err)}`,
            i18n.translate('xpack.aiPanel.error.templateRender', {
              defaultMessage:
                "Couldn't render the panel. Try simplifying the request — for example, asking for one visualization at a time.",
            })
          );
          return;
        }
        selfWriteCountRef.current++;
        onTemplateChangeRef.current(cleaned);
      } else if (!esqlQuery) {
        if (containsScript(accRef.current)) {
          retryOrFail(
            'the generated HTML used JavaScript, which this panel type does not support',
            SCRIPT_ERROR_MESSAGE
          );
          return;
        }
        rendered = prepareHtml(accRef.current);
        selfWriteCountRef.current++;
        onTemplateChangeRef.current(rendered);
      } else {
        return;
      }

      setHtml(rendered);
      setIsLoading(false);
    };

    if (esqlQuery) {
      fetchEsqlData(search, core.http, esqlQuery, timeRange, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          esqlData = data;
          dataDone = true;
          tryFinish();
        })
        .catch((err: Error) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          hasFailed = true;
          setError(err.message || 'Failed to fetch data');
          setIsLoading(false);
        });
    }

    const runLlmGeneration = (retryReason?: string) => {
      const promptForLlm = retryReason
        ? `${prompt}\n\nNote: the previous attempt failed because ${retryReason}. Fix this and regenerate.`
        : prompt;

      streamGenerate(
        core.http,
        { prompt: promptForLlm, esqlQuery, timeRange, colorMode },
        (token) => {
          accRef.current += token;
        },
        controller.signal
      )
        .catch((err: Error) => {
          if (err.name !== 'AbortError') {
            hasFailed = true;
            stopInterval();
            if (err.message.toLowerCase().includes('no inference connector')) {
              setIsAiUnavailable(true);
              setIsLoading(false);
            } else {
              setError(err instanceof Error ? err.message : String(err));
              setIsLoading(false);
            }
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
      stopInterval();
      controller.abort();
    };
  }, [embeddableId, prompt, esqlQuery, timeRange, generationVersion, savedTemplate, colorMode]);

  return { html, isLoading, error, isAiUnavailable };
}
