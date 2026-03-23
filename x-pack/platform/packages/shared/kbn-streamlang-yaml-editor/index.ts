/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { StreamlangYamlEditor } from './src/streamlang_yaml_editor';
export type {
  StreamlangYamlEditorProps,
  StepDecoration,
  ValidationError,
  StepSummary,
  StepStatus,
} from './src/types';
export { useStepDecorations } from './src/hooks/use_step_decorations';
export {
  getStreamlangMonacoSchemaConfig,
  generateStreamlangJsonSchema,
} from './src/validation/schema_generator';
export {
  mapStepsToYamlLines,
  getStepDecorations,
  type YamlLineMap,
} from './src/utils/yaml_line_mapper';
export { stripCustomIdentifiers } from './src/utils/strip_custom_identifiers';
