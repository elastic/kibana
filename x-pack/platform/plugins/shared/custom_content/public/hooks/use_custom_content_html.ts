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
import type { EsqlDataResult } from '../utils/fetch_esql_data';
import {
  fillTemplate,
  stripMarkdownFences,
  isValidTemplate,
  containsScript,
  prepareHtml,
} from '../utils/template_fill';

const SCRIPT_ERROR_MESSAGE = i18n.translate('xpack.customContent.error.templateScript', {
  defaultMessage:
    'The generated panel relied on JavaScript, which this panel type does not support. Try rephrasing the request.',
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

    // Fast path — static panel with stored HTML.
    if (template && !esqlQuery) {
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

    const { search, core } = getServices();

    // Fast path — ES|QL panel with stored template: run query only, no LLM.
    if (template && esqlQuery) {
      fetchEsqlData(search, core.http, esqlQuery, timeRange, controller.signal)
        .then(({ columns, values }) => {
          if (controller.signal.aborted) return;
          try {
            setHtml(fillTemplate(template, columns, values ?? []));
          } catch (err) {
            setError(
              i18n.translate('xpack.customContent.error.templateRender', {
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

    // Slow path — LLM generates template; for ES|QL panels data fetch runs in parallel.
    let esqlData: EsqlDataResult | null = null;
    let templateDone = false;
    let dataDone = !esqlQuery;
    let hasFailed = false;

    // Only content-quality failures (invalid/unsupported output) are worth retrying — the LLM
    // gets a concrete reason and a chance to fix it. Transport/connector/data errors are not.
    const MAX_CONTENT_RETRIES = 1;
    let retryCount = 0;

    let intervalRef: ReturnType<typeof setInterval> | undefined;
    const stopInterval = () => {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = undefined;
      }
    };

    // Stream partial HTML into the iframe for static panels only.
    if (!renderedHtmlRef.current && !esqlQuery) {
      intervalRef = setInterval(() => {
        if (acc) setHtml(prepareHtml(acc));
      }, 300);
    }

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

    const tryFinish = () => {
      if (!templateDone || !dataDone || hasFailed || controller.signal.aborted) return;
      stopInterval();

      let rendered: string;

      if (esqlQuery && esqlData) {
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
        try {
          rendered = fillTemplate(cleaned, esqlData.columns, esqlData.values ?? []);
        } catch (err) {
          retryOrFail(
            `the template failed to render: ${err instanceof Error ? err.message : String(err)}`,
            i18n.translate('xpack.customContent.error.templateRender', {
              defaultMessage:
                "Couldn't render the panel. Try simplifying the request — for example, asking for one visualization at a time.",
            })
          );
          return;
        }
        selfWrittenTemplateRef.current = cleaned;
        onTemplateChangeRef.current(cleaned);
      } else if (!esqlQuery) {
        if (containsScript(acc)) {
          retryOrFail(
            'the generated HTML used JavaScript, which this panel type does not support',
            SCRIPT_ERROR_MESSAGE
          );
          return;
        }
        rendered = prepareHtml(acc);
        selfWrittenTemplateRef.current = rendered;
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
