/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounceFn } from '@kbn/react-hooks';
import type { MonacoYaml, MonacoYamlOptions } from 'monaco-yaml';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import yaml from 'yaml';
import { CodeEditor } from '@kbn/code-editor';
import { configureMonacoYamlSchema } from '@kbn/monaco';
import type { monaco } from '@kbn/monaco';
import type { StreamlangYamlEditorProps, StepDecoration } from './types';
import { useStepDecorations } from './hooks/use_step_decorations';
import { useGutterSimulationMarkers } from './hooks/use_gutter_simulation_markers';
import { useFocusedStepOutline } from './hooks/use_focused_step_outline';
import { getStreamlangMonacoSchemaConfig } from './validation/schema_generator';
import {
  mapStepsToYamlLines,
  getStepDecorations,
  type YamlLineMap,
} from './utils/yaml_line_mapper';
import { createStreamlangHoverProvider } from './monaco_providers';
import { stripCustomIdentifiers } from './utils/strip_custom_identifiers';
import { StepActions } from './components/step_actions';
import { getEditorContainerStyles, getEditorPanelStyles } from './styles';

// Configure Monaco YAML with completion and hover managed by custom providers
const defaultMonacoYamlOptions: MonacoYamlOptions = {
  completion: true, // Enable schema-based completions
  hover: false, // Hover is handled by custom providers
  validate: true, // Keep validation enabled
};

export const StreamlangYamlEditor = ({
  dsl,
  onChange,
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
}: StreamlangYamlEditorProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoYamlRef = useRef<MonacoYaml | null>(null);
  const [decorations, setDecorations] = useState<StepDecoration[]>([]);
  const [yamlLineMap, setYamlLineMap] = useState<YamlLineMap | undefined>(undefined);
  const { euiTheme } = useEuiTheme();

  // Compute initial display value from dsl (with stripped customIdentifiers)
  // This is only used for initialization - after that, internalValue is the source of truth
  const initialValue = useMemo(() => {
    // Strip customIdentifiers from DSL before converting to YAML for display
    const cleanedDsl = stripCustomIdentifiers(dsl);
    return yaml.stringify(cleanedDsl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only compute on mount

  const [internalValue, setInternalValue] = useState<string>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<string>(initialValue);
  const [isTyping, setIsTyping] = useState(false);

  // Create hover provider instance
  const hoverProvider = useMemo(() => createStreamlangHoverProvider(), []);

  // Configure Monaco YAML schema
  const schemas = useMemo(() => {
    const schemaConfig = getStreamlangMonacoSchemaConfig();
    return schemaConfig ? [schemaConfig] : [];
  }, []);

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
    async function configureMonacoYaml(yamlSchemas: MonacoYamlOptions['schemas']) {
      try {
        monacoYamlRef.current = await configureMonacoYamlSchema(
          yamlSchemas,
          defaultMonacoYamlOptions
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          'Failed to configure Streamlang schema validation, using basic YAML highlighting:',
          error
        );
      }
    }

    // Configure or update the monaco yaml schema and options when the schemas change
    if (!monacoYamlRef.current) {
      configureMonacoYaml(schemas);
    } else {
      monacoYamlRef.current.update({
        ...defaultMonacoYamlOptions,
        schemas,
      });
    }
  }, [schemas]);

  useEffect(() => {
    return () => {
      if (monacoYamlRef.current) {
        monacoYamlRef.current.dispose();
        monacoYamlRef.current = null;
      }
    };
  }, []);

  // Clear decorations immediately when user starts typing
  // Note: We keep yamlLineMap intact so that step actions and outlines continue to work
  useEffect(() => {
    if (isTyping) {
      setDecorations([]);
    }
  }, [isTyping]);

  const { run: scheduleDebouncedUpdate } = useDebounceFn(
    (value: string) => {
      setDebouncedValue(value);
      setIsTyping(false);
    },
    { wait: 500 }
  );

  useEffect(() => {
    scheduleDebouncedUpdate(internalValue);
  }, [internalValue, scheduleDebouncedUpdate]);

  // Update YAML line map whenever debounced value changes (independent of simulation)
  useEffect(() => {
    if (debouncedValue) {
      const lineMap = mapStepsToYamlLines(debouncedValue);
      setYamlLineMap(lineMap);
    } else {
      setYamlLineMap(undefined);
    }
  }, [debouncedValue]);

  // For performance reasons we maintain an internal value, rather than waiting for round trips,
  // and various levels of processing / validation to complete. This effect keeps the internal values in
  // sync when chosen props change.
  useEffect(() => {
    const cleanedDsl = stripCustomIdentifiers(dsl);
    const serialized = yaml.stringify(cleanedDsl);
    setInternalValue(serialized);
    setDebouncedValue(serialized);
    setIsTyping(false);
    editorRef.current?.setValue(serialized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...reinitializationDeps]);

  // Update decorations based on step summary (depends on simulation results)
  useEffect(() => {
    if (hasSimulationResult && yamlLineMap && stepSummary && stepSummary.size > 0) {
      const newDecorations = getStepDecorations(stepSummary, yamlLineMap);
      setDecorations(newDecorations);
    } else {
      setDecorations([]);
    }
  }, [yamlLineMap, stepSummary, hasSimulationResult]);

  const { styles: decorationStyles } = useStepDecorations(editorRef.current, decorations);

  // Add gutter error markers based on processorsMetrics (also debounced via yamlLineMap)
  useGutterSimulationMarkers(
    editorRef.current,
    canRunSimulation,
    hasSimulationResult,
    processorsMetrics,
    yamlLineMap,
    stepSummary
  );

  // Add blue border around the focused step (based on cursor position)
  const { styles: focusedStepStyles, focusedStepInfo } = useFocusedStepOutline(
    editorRef.current,
    yamlLineMap
  );

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      if (onMount) {
        onMount(editor);
      }
    },
    [onMount]
  );

  const handleChange = useCallback(
    (newValue: string) => {
      if (!readOnly) {
        if (onChange) {
          onChange(newValue);
        }
        setInternalValue(newValue);
        setIsTyping(true); // Mark as typing to clear decorations immediately
      }
    },
    [onChange, readOnly]
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
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
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
