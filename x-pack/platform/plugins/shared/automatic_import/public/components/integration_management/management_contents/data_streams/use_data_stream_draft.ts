/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DataStreamEditsFailure,
  DataStreamEditsResult,
  DataStreamResults,
  FieldTypeChange,
  FieldTypeEdit,
  FieldTypeError,
  FieldTypeOverride,
  PipelineDefinition,
  PipelineErrors,
} from '../../../../../common';
import { readBackFieldTypeProcessors, syncFieldTypeProcessors } from '../../../../../common';
import { useApplyDataStreamEdits } from '../../../../common';
import { useTelemetry } from '../../../telemetry_context';
import * as i18n from './translations';
import { diffPipelineLines, unwrapPipelineDocument } from './utils';

type PendingTypes = Record<string, string>;

interface UseDataStreamDraftParams {
  integrationId: string;
  dataStreamId: string;
  data: DataStreamResults | undefined;
  isEditable: boolean;
}

const EMPTY_DOCUMENTS: Array<Record<string, unknown>> = [];
const EMPTY_OVERRIDES: FieldTypeOverride[] = [];
const EMPTY_PENDING: PendingTypes = {};
const EMPTY_NAMES: string[] = [];
const LIVE_CHECK_DELAY_MS = 800;

const stringifyPipeline = (pipeline: object): string => JSON.stringify(pipeline, null, 2);

const isPipelineDefinition = (value: unknown): value is PipelineDefinition =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (!('processors' in value) || Array.isArray(value.processors));

/** Throws with a readable message when the text is not a pipeline object. */
const parsePipeline = (text: string): PipelineDefinition => {
  const parsed: unknown = JSON.parse(text);
  if (!isPipelineDefinition(parsed)) {
    throw new Error(i18n.EDIT_PIPELINE_FLYOUT.pipelineNotObjectError);
  }
  return parsed;
};

const unwrapDocuments = (
  documents: Array<Record<string, unknown>>
): Array<Record<string, unknown>> =>
  documents
    .map((document) => unwrapPipelineDocument(document))
    .filter((document): document is Record<string, unknown> => document !== undefined);

const toChanges = (pendingTypes: PendingTypes): FieldTypeChange[] =>
  Object.entries(pendingTypes).map(([name, type]) => ({ name, type }));

const byName = (errors: FieldTypeError[]): Record<string, FieldTypeError> =>
  Object.fromEntries(errors.map((error) => [error.name, error]));

/** Staged types relative to the saved data stream that reproduce the preview. */
const getPendingFromPreview = (
  preview: DataStreamEditsResult,
  savedOverrides: FieldTypeOverride[]
): PendingTypes => {
  const savedTypes = new Map(savedOverrides.map(({ name, type }) => [name, type]));
  const previewNames = new Set(preview.field_type_overrides.map(({ name }) => name));
  const pending: PendingTypes = {};

  for (const { name, type } of preview.field_type_overrides) {
    if (savedTypes.get(name) !== type) pending[name] = type;
  }
  const removedNames = savedOverrides
    .map(({ name }) => name)
    .filter((name) => !previewNames.has(name) && !preview.dropped_field_types.includes(name));
  for (const name of removedNames) {
    const type = preview.field_mapping.find((mapping) => mapping.name === name)?.type;
    if (type) pending[name] = type;
  }
  return pending;
};

/**
 * Keeps one draft of the field types and the ingest pipeline. Switching to the Pipeline tab rebuilds
 * the generated processors in the browser; switching back to the Table tab previews pipeline edits
 * on the server, and pipeline edits are checked there once typing stops. Save stores both. A dirty
 * draft keeps the version it started from, so a refetch can't hide a save from somewhere else.
 */
export const useDataStreamDraft = ({
  integrationId,
  dataStreamId,
  data,
  isEditable,
}: UseDataStreamDraftParams) => {
  const { applyDataStreamEditsMutation } = useApplyDataStreamEdits();
  const { reportPipelineEdited } = useTelemetry();
  const [preview, setPreview] = useState<DataStreamEditsResult>();
  const [pendingTypes, setPendingTypes] = useState<PendingTypes>(EMPTY_PENDING);
  const [fieldErrors, setFieldErrors] = useState<Record<string, FieldTypeError>>({});
  const [pipelineErrors, setPipelineErrors] = useState<PipelineErrors>();
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [droppedFieldTypes, setDroppedFieldTypes] = useState<string[]>([]);
  const [pendingBreakingChanges, setPendingBreakingChanges] = useState<string[]>([]);
  const [checkedRemovedFields, setCheckedRemovedFields] = useState<string[]>();
  const [pipelineText, setPipelineText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [draftVersion, setDraftVersion] = useState<string>();
  const syncedTextRef = useRef('');
  const checkTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const checkIdRef = useRef(0);
  const hasCheckResultsRef = useRef(false);

  const isDataStreamApproved = data?.data_stream_approved ?? false;
  const savedOverrides = data?.field_type_overrides ?? EMPTY_OVERRIDES;
  const savedDocuments = useMemo(() => unwrapDocuments(data?.results ?? EMPTY_DOCUMENTS), [data]);
  const baselineText = useMemo(() => {
    if (!data?.ingest_pipeline) return '';
    return stringifyPipeline(
      syncFieldTypeProcessors(
        data.ingest_pipeline as PipelineDefinition,
        data.field_type_overrides,
        savedDocuments
      )
    );
  }, [data, savedDocuments]);

  const fieldMappings = preview?.field_mapping ?? data?.field_mapping;
  const fieldTypeOverrides = preview?.field_type_overrides ?? data?.field_type_overrides;
  const documents = preview?.results ?? data?.results ?? EMPTY_DOCUMENTS;
  const draftDocuments = useMemo(
    () => (preview ? unwrapDocuments(preview.results) : savedDocuments),
    [preview, savedDocuments]
  );
  const hasPending = Object.keys(pendingTypes).length > 0;
  const isDirty = hasPending || pipelineText !== baselineText;
  const baseVersion = draftVersion ?? data?.version;

  useEffect(() => {
    if (!isDirty) {
      setDraftVersion(undefined);
    } else if (data?.version) {
      const startVersion = data.version;
      setDraftVersion((current) => current ?? startVersion);
    }
  }, [data?.version, isDirty]);

  /** Stops a scheduled or running pipeline check; a running one's result is ignored. */
  const cancelCheck = useCallback(() => {
    clearTimeout(checkTimerRef.current);
    checkIdRef.current += 1;
    setIsChecking(false);
  }, []);

  useEffect(() => () => clearTimeout(checkTimerRef.current), []);

  const clearDraft = useCallback(
    (text: string) => {
      cancelCheck();
      hasCheckResultsRef.current = false;
      syncedTextRef.current = text;
      setPipelineText(text);
      setPreview(undefined);
      setPendingTypes(EMPTY_PENDING);
      setFieldErrors({});
      setPipelineErrors(undefined);
      setPipelineError(null);
      setDroppedFieldTypes([]);
      setPendingBreakingChanges([]);
      setCheckedRemovedFields(undefined);
    },
    [cancelCheck]
  );

  useEffect(() => {
    clearDraft('');
    setDraftVersion(undefined);
  }, [clearDraft, dataStreamId]);

  useEffect(() => {
    if (preview || hasPending || pipelineText !== syncedTextRef.current) return;
    syncedTextRef.current = baselineText;
    setPipelineText(baselineText);
  }, [baselineText, hasPending, pipelineText, preview]);

  const getDraftEdits = useCallback(
    (pending: PendingTypes): FieldTypeEdit[] => {
      const baseOverrides = fieldTypeOverrides ?? EMPTY_OVERRIDES;
      const originalTypes = new Map(
        baseOverrides.map(({ name, original_type: originalType }) => [name, originalType])
      );
      const edits = new Map<string, FieldTypeEdit>(
        baseOverrides.map((override) => [override.name, override])
      );

      for (const [name, type] of Object.entries(pending)) {
        const originalType =
          originalTypes.get(name) ?? fieldMappings?.find((mapping) => mapping.name === name)?.type;
        if (type === originalType) {
          edits.delete(name);
        } else if (originalType) {
          edits.set(name, { name, type, original_type: originalType });
        }
      }
      return [...edits.values()];
    },
    [fieldMappings, fieldTypeOverrides]
  );

  /**
   * Adds edits to the generated processors in the pipeline text, including ones added by hand, to
   * the staged types. Approved data streams don't accept type changes, so the server reads those
   * edits back and reports them.
   */
  const foldPipelineEdits = useCallback(
    (pipeline: PipelineDefinition): PendingTypes => {
      if (isDataStreamApproved) return pendingTypes;
      const { changes } = readBackFieldTypeProcessors(
        pipeline,
        getDraftEdits(pendingTypes),
        fieldMappings ? { fieldMapping: fieldMappings } : undefined
      );
      if (changes.length === 0) return pendingTypes;
      return {
        ...pendingTypes,
        ...Object.fromEntries(changes.map(({ name, type }) => [name, type])),
      };
    },
    [fieldMappings, getDraftEdits, isDataStreamApproved, pendingTypes]
  );

  const stageType = useCallback(
    (fieldName: string, nextType: string) => {
      setFieldErrors(({ [fieldName]: _cleared, ...remaining }) => remaining);
      const savedType = data?.field_mapping.find(({ name }) => name === fieldName)?.type;
      const baseType =
        preview?.field_mapping.find(({ name }) => name === fieldName)?.type ?? savedType;
      setPendingTypes((current) => {
        if (nextType === savedType && baseType === savedType) {
          const { [fieldName]: _removed, ...remaining } = current;
          return remaining;
        }
        return { ...current, [fieldName]: nextType };
      });
    },
    [data, preview]
  );

  const applyFailure = useCallback((response: DataStreamEditsFailure) => {
    setFieldErrors(byName(response.field_errors));
    setPipelineErrors(response.pipeline_errors);
  }, []);

  const applyPreview = useCallback(
    (response: DataStreamEditsResult, sentText: string, sentPipeline: PipelineDefinition) => {
      const text =
        JSON.stringify(response.ingest_pipeline) === JSON.stringify(sentPipeline)
          ? sentText
          : stringifyPipeline(response.ingest_pipeline);
      syncedTextRef.current = text;
      setPipelineText(text);
      setPreview(response);
      setPendingTypes(getPendingFromPreview(response, savedOverrides));
      setFieldErrors({});
      setDroppedFieldTypes(response.dropped_field_types);
      setCheckedRemovedFields(undefined);
      hasCheckResultsRef.current = false;
    },
    [savedOverrides]
  );

  /**
   * Previews the pipeline text on the server and shows its errors and removed approved fields,
   * without changing the draft. Only the latest check's result is used.
   */
  const checkPipeline = useCallback(
    async (text: string) => {
      if (!data || !baseVersion) return;
      if (text === syncedTextRef.current) {
        if (!hasCheckResultsRef.current) return;
        hasCheckResultsRef.current = false;
        setFieldErrors({});
        setPipelineErrors(undefined);
        setCheckedRemovedFields(undefined);
        return;
      }
      let parsed: PipelineDefinition;
      try {
        parsed = parsePipeline(text);
      } catch (error) {
        setPipelineError(i18n.EDIT_PIPELINE_FLYOUT.invalidJsonError((error as Error).message));
        return;
      }

      checkIdRef.current += 1;
      const checkId = checkIdRef.current;
      setIsChecking(true);
      try {
        const response = await applyDataStreamEditsMutation.mutateAsync({
          integrationId,
          dataStreamId,
          ingestPipeline: text,
          changes: toChanges(foldPipelineEdits(parsed)),
          version: baseVersion,
          dryRun: true,
        });
        if (checkId !== checkIdRef.current) return;
        hasCheckResultsRef.current = true;
        if (response.status === 'failure') {
          applyFailure(response);
          setCheckedRemovedFields(EMPTY_NAMES);
        } else {
          setFieldErrors({});
          setPipelineErrors(undefined);
          setCheckedRemovedFields(response.removed_approved_fields);
        }
      } catch (error) {
        if (checkId === checkIdRef.current) setPipelineError((error as Error).message);
      } finally {
        if (checkId === checkIdRef.current) setIsChecking(false);
      }
    },
    [
      applyDataStreamEditsMutation,
      applyFailure,
      baseVersion,
      data,
      dataStreamId,
      foldPipelineEdits,
      integrationId,
    ]
  );

  /** Rebuilds the generated processors in the pipeline text from the staged field types. */
  const syncToPipeline = useCallback(() => {
    if (!isEditable) return;
    let parsed: PipelineDefinition;
    try {
      parsed = parsePipeline(pipelineText);
    } catch {
      return;
    }
    const rebuilt = syncFieldTypeProcessors(parsed, getDraftEdits(pendingTypes), draftDocuments);
    const text =
      JSON.stringify(rebuilt) === JSON.stringify(parsed)
        ? pipelineText
        : stringifyPipeline(rebuilt);
    syncedTextRef.current = text;
    setPipelineText(text);
  }, [draftDocuments, getDraftEdits, isEditable, pendingTypes, pipelineText]);

  /** Previews pipeline edits on the server. Resolves to true when the Table tab can be shown. */
  const syncToTable = useCallback(async (): Promise<boolean> => {
    if (!isEditable || !data || !baseVersion) return true;
    cancelCheck();
    let parsed: PipelineDefinition;
    try {
      parsed = parsePipeline(pipelineText);
    } catch (error) {
      setPipelineError(i18n.EDIT_PIPELINE_FLYOUT.invalidJsonError((error as Error).message));
      return false;
    }
    if (pipelineText === syncedTextRef.current) return true;

    const pending = foldPipelineEdits(parsed);
    setIsSyncing(true);
    setPipelineError(null);
    setPipelineErrors(undefined);
    try {
      const response = await applyDataStreamEditsMutation.mutateAsync({
        integrationId,
        dataStreamId,
        ingestPipeline: pipelineText,
        changes: toChanges(pending),
        version: baseVersion,
        dryRun: true,
      });
      if (response.status === 'failure') {
        setPendingTypes(pending);
        applyFailure(response);
        return false;
      }
      applyPreview(response, pipelineText, parsed);
      return true;
    } catch (error) {
      setPipelineError((error as Error).message);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [
    applyDataStreamEditsMutation,
    applyFailure,
    applyPreview,
    baseVersion,
    cancelCheck,
    data,
    dataStreamId,
    foldPipelineEdits,
    integrationId,
    isEditable,
    pipelineText,
  ]);

  /**
   * Resolves to true when the edits were saved. A save that stops producing approved fields is
   * held in `pendingBreakingChanges` until it's resent with `acknowledgeBreakingChanges`.
   */
  const save = useCallback(
    async (isPipelineTab: boolean, acknowledgeBreakingChanges = false): Promise<boolean> => {
      if (!data || !baseVersion) return false;
      cancelCheck();
      let pending = pendingTypes;
      if (isPipelineTab) {
        let parsed: PipelineDefinition;
        try {
          parsed = parsePipeline(pipelineText);
        } catch (error) {
          setPipelineError(i18n.EDIT_PIPELINE_FLYOUT.invalidJsonError((error as Error).message));
          return false;
        }
        if (pipelineText !== syncedTextRef.current) pending = foldPipelineEdits(parsed);
      }

      setIsSaving(true);
      setPipelineError(null);
      setPipelineErrors(undefined);
      try {
        const response = await applyDataStreamEditsMutation.mutateAsync({
          integrationId,
          dataStreamId,
          ingestPipeline: pipelineText,
          changes: toChanges(pending),
          version: baseVersion,
          dryRun: false,
          acknowledgeBreakingChanges,
        });
        if (response.status === 'failure') {
          setPendingTypes(pending);
          applyFailure(response);
          setPendingBreakingChanges(response.removed_approved_fields ?? []);
          return false;
        }
        if (pipelineText !== baselineText) {
          reportPipelineEdited({
            integrationId,
            dataStreamId,
            ...diffPipelineLines(baselineText, pipelineText),
          });
        }
        clearDraft(pipelineText);
        setDraftVersion(response.version);
        return true;
      } catch (error) {
        setPipelineError((error as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [
      applyDataStreamEditsMutation,
      applyFailure,
      baseVersion,
      baselineText,
      cancelCheck,
      clearDraft,
      data,
      dataStreamId,
      foldPipelineEdits,
      integrationId,
      pendingTypes,
      pipelineText,
      reportPipelineEdited,
    ]
  );

  const reset = useCallback(() => clearDraft(baselineText), [baselineText, clearDraft]);

  const cancelBreakingChanges = useCallback(() => setPendingBreakingChanges([]), []);

  const updatePipelineText = useCallback(
    (value: string) => {
      setPipelineText(value);
      setPipelineError(null);
      cancelCheck();
      if (!isEditable) return;
      checkTimerRef.current = setTimeout(() => checkPipeline(value), LIVE_CHECK_DELAY_MS);
    },
    [cancelCheck, checkPipeline, isEditable]
  );

  return {
    fieldMappings,
    savedFieldMappings: data?.field_mapping,
    fieldTypeOverrides,
    approvedFieldTypes: data?.approved_field_types,
    isDataStreamApproved,
    documents,
    pendingTypes,
    fieldErrors,
    pipelineErrors,
    pipelineError,
    droppedFieldTypes,
    removedApprovedFields: checkedRemovedFields ?? preview?.removed_approved_fields ?? EMPTY_NAMES,
    pendingBreakingChanges,
    cancelBreakingChanges,
    pipelineText,
    setPipelineText: updatePipelineText,
    isDirty,
    isChecking,
    isSyncing,
    isSaving,
    stageType,
    syncToPipeline,
    syncToTable,
    save,
    reset,
  };
};
