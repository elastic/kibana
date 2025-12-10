/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounceFn } from '@kbn/react-hooks';
import type { MonacoYamlOptions } from 'monaco-yaml';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import yaml from 'yaml';
import { CodeEditor } from '@kbn/code-editor';
import { monaco } from '@kbn/monaco';
import type { StreamlangYamlEditorProps, StepDecoration } from './types';
import { useStepDecorations } from './hooks/use_step_decorations';
import { useGutterSimulationMarkers } from './hooks/use_gutter_simulation_markers';
import { useGutterValidationMarkers } from './hooks/use_gutter_validation_markers';
import { useFocusedStepOutline } from './hooks/use_focused_step_outline';
import { getStreamlangMonacoSchemaConfig } from './validation/schema_generator';
import {
  mapStepsToYamlLines,
  getStepDecorations,
  type YamlLineMap,
} from './utils/yaml_line_mapper';
import { createStreamlangHoverProvider } from './monaco_providers';
import { sanitiseForEditing } from './utils/sanitise_for_editing';
import { canRunSimulationForStep } from './utils/can_run_simulation';
import { yamlLanguageService } from './services/yaml_language_service';
import { StepActions } from './components/step_actions';
import { getEditorContainerStyles, getEditorPanelStyles } from './styles';

// Configure Monaco YAML with completion and hover managed by custom providers
const defaultMonacoYamlOptions: Partial<MonacoYamlOptions> = {
  completion: true, // Enable schema-based completions
  hover: false, // Hover is handled by custom providers
  validate: true, // Keep validation enabled
};

export const StreamlangYamlEditor = ({
  dsl,
  onDslChange,
  readOnly = false,
  height = '100%',
  onMount,
  'data-test-subj': dataTestSubj = 'streamlangYamlEditor',
  stepSummary,
  processorsMetrics,
  hasSimulationResult = false,
  onRunUpToStep,
  canRunSimulation = false,
  additiveStepIds = [],
  reinitializationDeps = [],
  simulationMode = 'partial',
  streamType,
  validationErrors,
}: StreamlangYamlEditorProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [decorations, setDecorations] = useState<StepDecoration[]>([]);
  const [yamlLineMap, setYamlLineMap] = useState<YamlLineMap | undefined>(undefined);
  const { euiTheme } = useEuiTheme();

  // Compute initial display value from dsl (with internal fields stripped)
  // This is only used for initialization - after that, internalValue is the source of truth
  const initialValue = useMemo(() => {
    // Strip internal fields from DSL before converting to YAML for display
    const cleanedDsl = sanitiseForEditing(dsl);
    return yaml.stringify(cleanedDsl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only compute on mount

  const [internalValue, setInternalValue] = useState<string>(initialValue);
  const [isTyping, setIsTyping] = useState(false);

  // Track whether simulation results are current (match the editor content)
  // When content changes, we hide simulation decorations until a new simulation runs (an explicit action)
  // This is because things like line mappings will fall out of sync as content is edited,
  // but we also don't want to simulate on every key press (even if it's debounced).
  const [simulationIsCurrent, setSimulationIsCurrent] = useState(true);

  // Track the last value we sent to onDslChange to avoid duplicate calls
  const lastNotifiedValueRef = useRef<string>(initialValue);

  // Track processorsMetrics reference to detect when a new simulation has run
  const previousProcessorsMetricsRef = useRef(processorsMetrics);

  // Create hover provider instance
  const hoverProvider = useMemo(() => createStreamlangHoverProvider(), []);

  // Configure Monaco YAML schema
  const schemas = useMemo(() => {
    const schemaConfig = getStreamlangMonacoSchemaConfig(streamType);
    return schemaConfig ? [schemaConfig] : [];
  }, [streamType]);

  const glyphSize = euiTheme.size.m;
  const glyphMarginTop = euiTheme.size.xs;

  const panelStyles = useMemo(
    () =>
      getEditorPanelStyles({
        height,
      }),
    [height]
  );

  const containerStyles = useMemo(
    () =>
      getEditorContainerStyles({
        euiTheme,
        glyphSize,
        glyphMarginTop,
      }),
    [euiTheme, glyphMarginTop, glyphSize]
  );

  useEffect(() => {
    // Register this editor with the YAML language service
    // The service manages a singleton monaco-yaml instance with reference counting
    // to support multiple editors on the same page and prevents "Worker manager has been disposed" errors
    yamlLanguageService.register(schemas, defaultMonacoYamlOptions).catch((error) => {
      // eslint-disable-next-line no-console
      console.warn(
        'Failed to configure Streamlang schema validation, using basic YAML highlighting:',
        error
      );
    });

    return () => {
      // Release this editor's registration
      // Schemas are only cleared when the last editor unmounts (reference counting)
      yamlLanguageService.release();
    };
  }, [schemas]);

  // Detect when a new simulation has run by tracking processorsMetrics reference changes
  useEffect(() => {
    if (processorsMetrics !== previousProcessorsMetricsRef.current) {
      previousProcessorsMetricsRef.current = processorsMetrics;
      // New simulation results have arrived, mark them as current
      if (processorsMetrics) {
        setSimulationIsCurrent(true);
      }
    }
  }, [processorsMetrics]);

  // Clear decorations immediately when user starts typing
  // Note: We keep yamlLineMap intact so that step actions and outlines continue to work
  useEffect(() => {
    if (isTyping) {
      setDecorations([]);
    }
  }, [isTyping]);

  // Single debounced handler for all post-change processing:
  // - Update YAML line map (for step actions, decorations, etc.)
  // - Parse YAML and notify parent if valid
  const { run: processChanges } = useDebounceFn(
    (value: string) => {
      setIsTyping(false);

      // Update YAML line map
      if (value) {
        const lineMap = mapStepsToYamlLines(value);
        setYamlLineMap(lineMap);
      } else {
        setYamlLineMap(undefined);
      }

      // Parse YAML and notify parent if parsable and changed
      if (value && value !== lastNotifiedValueRef.current && onDslChange) {
        try {
          const parsedDsl = yaml.parse(value);
          lastNotifiedValueRef.current = value;
          onDslChange(parsedDsl, value);
        } catch {
          // YAML isn't parsable.
        }
      }
    },
    { wait: 300 }
  );

  // For performance reasons we maintain an internal value, rather than waiting for round trips,
  // and various levels of processing / validation to complete. This effect keeps the internal values in
  // sync when chosen props change.
  useEffect(() => {
    const cleanedDsl = sanitiseForEditing(dsl);
    const serialized = yaml.stringify(cleanedDsl);
    setInternalValue(serialized);
    setIsTyping(false);
    // Update the last notified value so reinitialized content isn't treated as a user change
    lastNotifiedValueRef.current = serialized;
    // Update line map immediately for the new content
    if (serialized) {
      const lineMap = mapStepsToYamlLines(serialized);
      setYamlLineMap(lineMap);
    }
    editorRef.current?.setValue(serialized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...reinitializationDeps]);

  // Update decorations based on step summary (depends on simulation results)
  // Only show decorations if simulation results are current (content hasn't changed since simulation)
  useEffect(() => {
    if (
      simulationIsCurrent &&
      hasSimulationResult &&
      yamlLineMap &&
      stepSummary &&
      stepSummary.size > 0
    ) {
      const newDecorations = getStepDecorations(stepSummary, yamlLineMap);
      setDecorations(newDecorations);
    } else {
      setDecorations([]);
    }
  }, [yamlLineMap, stepSummary, hasSimulationResult, simulationIsCurrent]);

  const { styles: decorationStyles } = useStepDecorations(editorRef.current, decorations);

  // Add gutter error markers based on processorsMetrics (also debounced via yamlLineMap)
  // Only show simulation gutter markers if simulation results are current
  useGutterSimulationMarkers(
    editorRef.current,
    canRunSimulation,
    hasSimulationResult && simulationIsCurrent,
    simulationIsCurrent ? processorsMetrics : undefined,
    yamlLineMap,
    simulationIsCurrent ? stepSummary : undefined
  );

  // Add validation error gutter markers (independent of simulation)
  useGutterValidationMarkers(editorRef.current, validationErrors, yamlLineMap);

  // Add blue border around the focused step (based on cursor position)
  const { styles: focusedStepStyles, focusedStepInfo } = useFocusedStepOutline(
    editorRef.current,
    yamlLineMap
  );

  // Keep refs for values needed in keyboard shortcut callback
  // This allows the callback to access current values without recreating the keybinding
  const runSimulationRef = useRef<{
    onRunUpToStep: typeof onRunUpToStep;
    focusedStepInfo: typeof focusedStepInfo;
    canRunSimulation: boolean;
    additiveStepIds: string[];
    simulationMode: typeof simulationMode;
    readOnly: boolean;
  }>({
    onRunUpToStep,
    focusedStepInfo,
    canRunSimulation,
    additiveStepIds,
    simulationMode,
    readOnly,
  });

  // Update ref whenever relevant values change
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
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      // Add keyboard shortcut: Cmd+Enter (Mac) / Ctrl+Enter (Windows) to run simulation
      editor.addAction({
        id: 'streamlang.runSimulation',
        label: 'Run simulation up to this step',
        // eslint-disable-next-line no-bitwise
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        run: () => {
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

          const canRunShortcut = canRunSimulationForStep({
            canRunSimulation: canRun,
            additiveStepIds: additiveIds,
            stepId: stepInfo.stepId,
            simulationMode: simMode,
          });

          if (canRunShortcut) {
            runUpToStep(stepInfo.stepId);
          }
        },
      });

      if (onMount) {
        onMount(editor);
      }
    },
    [onMount]
  );

  const handleChange = useCallback(
    (newValue: string) => {
      if (!readOnly) {
        setInternalValue(newValue);
        processChanges(newValue); // Debounced processing of the change
        setIsTyping(true); // Mark as typing to clear decorations immediately
        setSimulationIsCurrent(false); // Mark simulation as stale until explicitly re-run
      }
    },
    [readOnly, processChanges]
  );

  return (
    <EuiPanel
      // NOTE: Incredibly insidious but this must be false or the transforms
      // applied for shadows will break Monaco's fixed positioning for menus
      hasShadow={false}
      borderRadius="none"
      paddingSize="none"
      css={panelStyles}
      data-test-subj={dataTestSubj}
    >
      <div css={[containerStyles, decorationStyles, focusedStepStyles]}>
        <CodeEditor
          languageId="yaml"
          value={internalValue}
          onChange={handleChange}
          hoverProvider={hoverProvider}
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
            renderLineHighlight: 'line',
            // YAML indentation settings
            tabSize: 2,
            insertSpaces: true,
            formatOnType: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
            },
            // Enable automatic suggestions as you type
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
            editor={editorRef.current}
            simulationMode={simulationMode}
          />
        )}
      </div>
    </EuiPanel>
  );
};
