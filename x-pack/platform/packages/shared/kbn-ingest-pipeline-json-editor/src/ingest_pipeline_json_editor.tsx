/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounceFn } from '@kbn/react-hooks';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { CodeEditor, monaco } from '@kbn/code-editor';
import type { IngestPipelineJsonEditorProps, StepDecoration } from './types';
import { useStepDecorations } from './hooks/use_step_decorations';
import { useGutterSimulationMarkers } from './hooks/use_gutter_simulation_markers';
import { useGutterValidationMarkers } from './hooks/use_gutter_validation_markers';
import { useFocusedStepOutline } from './hooks/use_focused_step_outline';
import { getIngestPipelineMonacoSchemaConfig } from './validation/schema_generator';
import {
  mapStepsToJsonLines,
  getStepDecorations,
  type JsonLineMap,
} from './utils/json_line_mapper';
import { canRunSimulationForStep } from './utils/can_run_simulation';
import { StepActions } from './components/step_actions';
import { getEditorContainerStyles, getEditorPanelStyles } from './styles';

const debounceOptions = { wait: 300 };

export const IngestPipelineJsonEditor = ({
  processors,
  onProcessorsChange,
  readOnly = false,
  height = '100%',
  onMount,
  'data-test-subj': dataTestSubj = 'ingestPipelineJsonEditor',
  stepSummary,
  simulationResult,
  processorsMetrics,
  hasSimulationResult = false,
  onRunUpToStep,
  canRunSimulation = false,
  additiveStepIds = [],
  reinitializationDeps = [],
  simulationMode = 'partial',
  validationErrors,
  onSchemaErrorsChange,
}: IngestPipelineJsonEditorProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const blurDisposableRef = useRef<monaco.IDisposable | undefined>(undefined);
  const [decorations, setDecorations] = useState<StepDecoration[]>([]);
  const { euiTheme } = useEuiTheme();

  const initialValueRef = useRef(JSON.stringify(processors, null, 2));
  const [jsonLineMap, setJsonLineMap] = useState<JsonLineMap | undefined>(() =>
    mapStepsToJsonLines(initialValueRef.current)
  );
  const [focusLineMap, setFocusLineMap] = useState<JsonLineMap | undefined>(() =>
    mapStepsToJsonLines(initialValueRef.current, { includeEmptyProcessors: true })
  );
  const [internalValue, setInternalValue] = useState<string>(initialValueRef.current);
  const internalValueRef = useRef<string>(initialValueRef.current);
  const [isTyping, setIsTyping] = useState(false);
  const [simulationIsCurrent, setSimulationIsCurrent] = useState(true);
  const lastNotifiedValueRef = useRef<string>(initialValueRef.current);
  const previousSimulationResultRef = useRef(simulationResult);
  const selfEditedValueRef = useRef<string | undefined>(undefined);
  const parsedProcessorsRef = useRef<IngestPipelineJsonEditorProps['processors']>(processors);
  const parsedProcessorsValueRef = useRef<string>(initialValueRef.current);

  const schemas = useMemo(() => [getIngestPipelineMonacoSchemaConfig()], []);
  const glyphSize = euiTheme.size.m;
  const glyphMarginTop = euiTheme.size.xs;

  const panelStyles = useMemo(() => getEditorPanelStyles({ height }), [height]);
  const containerStyles = useMemo(
    () => getEditorContainerStyles({ euiTheme, glyphSize, glyphMarginTop }),
    [euiTheme, glyphMarginTop, glyphSize]
  );

  const notifyProcessorsChange = useCallback(
    (parsedProcessors: IngestPipelineJsonEditorProps['processors'], parsedValue: string) => {
      if (!onProcessorsChange || parsedValue === lastNotifiedValueRef.current) {
        return;
      }

      lastNotifiedValueRef.current = parsedValue;
      selfEditedValueRef.current = parsedValue;
      onProcessorsChange(parsedProcessors, parsedValue);
    },
    [onProcessorsChange]
  );

  useEffect(() => {
    const previousOptions = monaco.languages.json.jsonDefaults.diagnosticsOptions;
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      ...previousOptions,
      validate: true,
      enableSchemaRequest: false,
      schemas: [...(previousOptions.schemas ?? []), ...schemas],
    });

    return () => {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions(previousOptions);
    };
  }, [schemas]);

  useEffect(() => {
    return () => {
      blurDisposableRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (simulationResult !== previousSimulationResultRef.current) {
      previousSimulationResultRef.current = simulationResult;
      if (simulationResult) {
        setSimulationIsCurrent(true);
      }
    }
  }, [simulationResult]);

  useEffect(() => {
    if (isTyping) {
      setDecorations([]);
    }
  }, [isTyping]);

  useEffect(() => {
    const model = editor?.getModel();
    if (!model) {
      onSchemaErrorsChange?.([]);
      return;
    }

    const updateSchemaErrors = () => {
      const schemaErrors = monaco.editor
        .getModelMarkers({ resource: model.uri })
        .filter((marker) => marker.severity >= monaco.MarkerSeverity.Warning)
        .map((marker) => marker.message);

      onSchemaErrorsChange?.(schemaErrors);
    };

    updateSchemaErrors();
    const markerRefreshTimeout = window.setTimeout(updateSchemaErrors, 250);

    const markerDisposable = monaco.editor.onDidChangeMarkers((uris) => {
      if (uris.some((uri) => uri.toString() === model.uri.toString())) {
        updateSchemaErrors();
      }
    });

    return () => {
      window.clearTimeout(markerRefreshTimeout);
      onSchemaErrorsChange?.([]);
      markerDisposable.dispose();
    };
  }, [editor, onSchemaErrorsChange]);

  const { run: processChanges } = useDebounceFn((value: string) => {
    setIsTyping(false);
    internalValueRef.current = value;
    setJsonLineMap(value ? mapStepsToJsonLines(value) : undefined);
    setFocusLineMap(
      value ? mapStepsToJsonLines(value, { includeEmptyProcessors: true }) : undefined
    );
    window.setTimeout(() => {
      const model = editorRef.current?.getModel();
      if (!model) {
        return;
      }

      const schemaErrors = monaco.editor
        .getModelMarkers({ resource: model.uri })
        .filter((marker) => marker.severity >= monaco.MarkerSeverity.Warning)
        .map((marker) => marker.message);

      onSchemaErrorsChange?.(schemaErrors);
    }, 250);

    if (value) {
      try {
        const parsedProcessors = JSON.parse(value);
        if (Array.isArray(parsedProcessors)) {
          parsedProcessorsRef.current =
            parsedProcessors as IngestPipelineJsonEditorProps['processors'];
          parsedProcessorsValueRef.current = value;
        }
      } catch {
        // JSON is not parsable yet.
      }
    }
  }, debounceOptions);

  const flushProcessorsChange = useCallback(() => {
    const currentValue = internalValueRef.current;
    try {
      const parsedProcessors = JSON.parse(currentValue);
      if (Array.isArray(parsedProcessors)) {
        parsedProcessorsRef.current =
          parsedProcessors as IngestPipelineJsonEditorProps['processors'];
        parsedProcessorsValueRef.current = currentValue;
      }
    } catch {
      return;
    }

    const parsedValue = parsedProcessorsValueRef.current;
    notifyProcessorsChange(parsedProcessorsRef.current, parsedValue);
  }, [notifyProcessorsChange]);

  useEffect(() => {
    if (selfEditedValueRef.current !== undefined) {
      selfEditedValueRef.current = undefined;
      return;
    }

    const serialized = JSON.stringify(processors, null, 2);
    if (serialized === internalValueRef.current) {
      setJsonLineMap((currentLineMap) => currentLineMap ?? mapStepsToJsonLines(serialized));
      setFocusLineMap(
        (currentLineMap) =>
          currentLineMap ?? mapStepsToJsonLines(serialized, { includeEmptyProcessors: true })
      );
      return;
    }

    setInternalValue(serialized);
    internalValueRef.current = serialized;
    setIsTyping(false);
    lastNotifiedValueRef.current = serialized;
    setJsonLineMap(serialized ? mapStepsToJsonLines(serialized) : undefined);
    setFocusLineMap(
      serialized ? mapStepsToJsonLines(serialized, { includeEmptyProcessors: true }) : undefined
    );
    editorRef.current?.setValue(serialized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...reinitializationDeps]);

  useEffect(() => {
    if (validationErrors && validationErrors.size > 0 && jsonLineMap) {
      setDecorations(
        Array.from(validationErrors.entries())
          .filter(([, errors]) => errors.length > 0)
          .flatMap(([stepId]) => {
            const lineInfo = jsonLineMap[stepId];
            return lineInfo
              ? [
                  {
                    stepId,
                    lineStart: lineInfo.lineStart,
                    lineEnd: lineInfo.lineEnd,
                    status: 'failure',
                  },
                ]
              : [];
          })
      );
    } else if (
      simulationIsCurrent &&
      hasSimulationResult &&
      jsonLineMap &&
      stepSummary &&
      stepSummary.size > 0
    ) {
      setDecorations(getStepDecorations(stepSummary, jsonLineMap));
    } else {
      setDecorations([]);
    }
  }, [jsonLineMap, stepSummary, hasSimulationResult, simulationIsCurrent, validationErrors]);

  const { styles: decorationStyles } = useStepDecorations(editor, decorations);

  useGutterSimulationMarkers(
    editor,
    canRunSimulation,
    hasSimulationResult && simulationIsCurrent,
    simulationIsCurrent ? processorsMetrics : undefined,
    jsonLineMap,
    simulationIsCurrent ? stepSummary : undefined
  );

  useGutterValidationMarkers(editor, validationErrors, jsonLineMap);

  const { styles: focusedStepStyles, focusedStepInfo } = useFocusedStepOutline(
    editor,
    focusLineMap
  );

  const runSimulationRef = useRef({
    onRunUpToStep,
    focusedStepInfo,
    canRunSimulation,
    additiveStepIds,
    simulationMode,
    readOnly,
  });

  useEffect(() => {
    runSimulationRef.current = {
      onRunUpToStep,
      focusedStepInfo,
      canRunSimulation,
      additiveStepIds,
      simulationMode,
      readOnly,
    };
  }, [onRunUpToStep, focusedStepInfo, canRunSimulation, additiveStepIds, simulationMode, readOnly]);

  const handleEditorDidMount = useCallback(
    (monacoEditor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = monacoEditor;
      setEditor(monacoEditor);

      monacoEditor.addAction({
        id: 'ingestPipeline.runSimulation',
        label: 'Run simulation up to this processor',
        // eslint-disable-next-line no-bitwise
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
          flushProcessorsChange();

          const {
            onRunUpToStep: runUpToStep,
            focusedStepInfo: stepInfo,
            canRunSimulation: canRun,
            additiveStepIds: additiveIds,
            simulationMode: simMode,
            readOnly: isReadOnly,
          } = runSimulationRef.current;

          if (isReadOnly || !runUpToStep || !stepInfo) {
            return;
          }

          if (
            canRunSimulationForStep({
              canRunSimulation: canRun,
              additiveStepIds: additiveIds,
              stepId: stepInfo.stepId,
              simulationMode: simMode,
            })
          ) {
            runUpToStep(stepInfo.stepId);
          }
        },
      });

      onMount?.(monacoEditor);

      blurDisposableRef.current?.dispose();
      blurDisposableRef.current = monacoEditor.onDidBlurEditorText(() => {
        flushProcessorsChange();
      });
    },
    [flushProcessorsChange, onMount]
  );

  const handleChange = useCallback(
    (newValue: string) => {
      if (!readOnly) {
        setInternalValue(newValue);
        internalValueRef.current = newValue;
        try {
          const parsedProcessors = JSON.parse(newValue);
          if (Array.isArray(parsedProcessors)) {
            parsedProcessorsRef.current =
              parsedProcessors as IngestPipelineJsonEditorProps['processors'];
            parsedProcessorsValueRef.current = newValue;
            notifyProcessorsChange(parsedProcessorsRef.current, newValue);
          }
        } catch {
          // JSON is not parsable yet.
        }
        processChanges(newValue);
        setIsTyping(true);
        setSimulationIsCurrent(false);
      }
    },
    [notifyProcessorsChange, readOnly, processChanges]
  );

  return (
    <EuiPanel
      hasShadow={false}
      borderRadius="none"
      paddingSize="none"
      css={panelStyles}
      data-test-subj={dataTestSubj}
    >
      <div css={[containerStyles, decorationStyles, focusedStepStyles]}>
        <CodeEditor
          languageId="json"
          value={internalValue}
          onChange={handleChange}
          options={{
            readOnly,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingStrategy: 'advanced',
            automaticLayout: true,
            fontSize: 14,
            lineNumbers: 'on',
            glyphMargin: true,
            fixedOverflowWidgets: true,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 2,
            renderLineHighlight: 'none',
            tabSize: 2,
            insertSpaces: true,
            formatOnType: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            suggest: {
              snippetsPreventQuickSuggestions: false,
              showSnippets: true,
            },
          }}
          editorDidMount={handleEditorDidMount}
        />
        {focusedStepInfo && onRunUpToStep && !readOnly && (
          <StepActions
            stepId={focusedStepInfo.stepId}
            lineStart={focusedStepInfo.lineStart}
            onRunUpToStep={onRunUpToStep}
            canRunSimulation={canRunSimulation}
            additiveStepIds={additiveStepIds}
            editor={editor}
            simulationMode={simulationMode}
          />
        )}
      </div>
    </EuiPanel>
  );
};
