/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/monaco';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { StreamType, StreamlangValidationError } from '@kbn/streamlang';

export interface StreamlangYamlEditorProps {
  /** Streamlang DSL object (customIdentifiers will be stripped automatically) */
  dsl: StreamlangDSL;
  /** Called when the YAML content changes and is parsable. Debounced internally. */
  onDslChange?: (dsl: StreamlangDSL, yaml: string) => void;
  readOnly?: boolean;
  height?: string;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  'data-test-subj'?: string;
  stepSummary?: StepSummary;
  processorsMetrics?: ProcessorsMetrics;
  /** Indicates whether a simulation result exists for the current DSL */
  hasSimulationResult?: boolean;
  /** Depedencies that should trigger reinitialisation of the editor when changed */
  reinitializationDeps?: unknown[];
  /** Callback for when user wants to run simulation up to a specific step */
  onRunUpToStep?: (stepId: string) => void;
  /** Whether the simulation can be run (used to enable/disable the run button) */
  canRunSimulation?: boolean;
  /** Array of step IDs that are new/additive (only these can have simulation run up to them) */
  additiveStepIds?: string[];
  /** Simulation mode of the active data source */
  simulationMode?: 'partial' | 'complete';
  /** Stream type to filter available actions (e.g., exclude manual_ingest_pipeline for wired streams) */
  streamType?: StreamType;
  /** Validation errors grouped by step ID */
  validationErrors?: Map<string, StreamlangValidationError[]>;
}

export type ProcessorsMetrics =
  APIReturnType<'POST /internal/streams/{name}/processing/_simulate'>['processors_metrics'];

export type ProcessorMetrics = ProcessorsMetrics[string];

export type StepStatus =
  | 'pending'
  | 'running'
  | 'failure'
  | 'success'
  | 'successWithWarnings'
  | 'skipped'
  | 'disabled';

export type StepSummary = Map<string, StepStatus>;

export type SimulationMode = 'partial' | 'complete';

export interface StepDecoration {
  stepId: string;
  lineStart: number;
  lineEnd: number;
  status: StepStatus;
}

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}
