/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUpdateDataStreamPipeline } from '../../../../common';
import { useTelemetry } from '../../../telemetry_context';
import * as i18n from './translations';
import { diffPipelineLines } from './utils';

interface UsePipelineEditorParams {
  integrationId: string;
  dataStreamId: string;
  ingestPipeline: Record<string, unknown> | undefined;
  version: string;
}

const stringifyPipeline = (ingestPipeline: Record<string, unknown> | undefined): string => {
  if (!ingestPipeline) return '';
  try {
    return JSON.stringify(ingestPipeline, null, 2);
  } catch {
    return '';
  }
};

export const usePipelineEditor = ({
  integrationId,
  dataStreamId,
  ingestPipeline,
  version,
}: UsePipelineEditorParams) => {
  const [pipelineText, setPipelineText] = useState('');
  const lastSyncedPipelineRef = useRef('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const { updateDataStreamPipelineMutation } = useUpdateDataStreamPipeline();
  const { reportPipelineEdited } = useTelemetry();
  const stringifiedPipeline = useMemo(() => stringifyPipeline(ingestPipeline), [ingestPipeline]);

  useEffect(() => {
    if (pipelineText === lastSyncedPipelineRef.current) {
      lastSyncedPipelineRef.current = stringifiedPipeline;
      setPipelineText(stringifiedPipeline);
    }
  }, [stringifiedPipeline, pipelineText]);

  const save = useCallback(async (): Promise<boolean> => {
    setSaveError(null);
    try {
      JSON.parse(pipelineText);
    } catch (e) {
      setSaveError(i18n.EDIT_PIPELINE_FLYOUT.invalidJsonError((e as Error).message));
      return false;
    }
    try {
      await updateDataStreamPipelineMutation.mutateAsync({
        integrationId,
        dataStreamId,
        ingestPipeline: pipelineText,
        version,
      });
      const { linesAdded, linesRemoved, netLineChange } = diffPipelineLines(
        stringifiedPipeline,
        pipelineText
      );
      reportPipelineEdited({
        integrationId,
        dataStreamId,
        linesAdded,
        linesRemoved,
        netLineChange,
      });
      lastSyncedPipelineRef.current = pipelineText;
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : i18n.EDIT_PIPELINE_FLYOUT.saveErrorMessage);
      return false;
    }
  }, [
    dataStreamId,
    integrationId,
    pipelineText,
    reportPipelineEdited,
    stringifiedPipeline,
    updateDataStreamPipelineMutation,
    version,
  ]);

  const reset = useCallback(() => {
    lastSyncedPipelineRef.current = stringifiedPipeline;
    setPipelineText(stringifiedPipeline);
    setSaveError(null);
  }, [stringifiedPipeline]);

  return {
    pipelineText,
    setPipelineText,
    saveError,
    clearSaveError: () => setSaveError(null),
    hasUnsavedChanges: pipelineText !== stringifiedPipeline,
    isSaving: updateDataStreamPipelineMutation.isLoading,
    save,
    reset,
  };
};
