/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { i18n } from '@kbn/i18n';
import type { TraceSpan } from '@kbn/llm-trace-waterfall';
import { useToasts } from './use_toasts';
import { parseTraceSpansFromFile } from '../utils/trace_utils';

const errorLabels = {
  title: i18n.translate('xpack.agentBuilder.loadTraceFromFile.errorTitle', {
    defaultMessage: 'Could not load trace file',
  }),
  body: i18n.translate('xpack.agentBuilder.loadTraceFromFile.errorBody', {
    defaultMessage:
      'The file does not contain a valid trace. Expected a JSON array of spans or an object with a "spans" array.',
  }),
};

interface UseLoadTraceFromFileResult {
  /** Call to open the OS file picker. */
  openFilePicker: () => void;
  /** Whether the trace flyout should be shown. */
  isFlyoutOpen: boolean;
  /** Spans parsed from the loaded file, or null when no file is loaded. */
  loadedSpans: TraceSpan[] | null;
  /** Trace ID parsed from the loaded file envelope, or undefined for bare span arrays. */
  loadedTraceId: string | undefined;
  /** Call to close the flyout and reset loaded state. */
  closeFlyout: () => void;
  /** Ref to attach to the hidden `<input type="file">` element. */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** onChange handler for the hidden file input. */
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const useLoadTraceFromFile = (): UseLoadTraceFromFileResult => {
  const [loadedSpans, setLoadedSpans] = useState<TraceSpan[] | null>(null);
  const [loadedTraceId, setLoadedTraceId] = useState<string | undefined>(undefined);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addErrorToast } = useToasts();

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setLoadedSpans(null);
    setLoadedTraceId(undefined);
  }, []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
        const result = await parseTraceSpansFromFile(file);
        if (result !== null) {
          setLoadedSpans(result.spans);
          setLoadedTraceId(result.traceId);
          setIsFlyoutOpen(true);
        } else {
          addErrorToast({ title: errorLabels.title, text: errorLabels.body });
        }
      } catch {
        addErrorToast({ title: errorLabels.title, text: errorLabels.body });
      }
    },
    [addErrorToast]
  );

  return {
    openFilePicker,
    isFlyoutOpen,
    loadedSpans,
    loadedTraceId,
    closeFlyout,
    fileInputRef,
    handleFileChange,
  };
};
