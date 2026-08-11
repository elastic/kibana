/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Configuration types
export type {
  AgentConfigurationIntake,
  AgentConfiguration,
} from './src/agent_configuration/configuration_types';

// Constants
export { AgentConfigurationPageStep } from './src/agent_configuration/constants';

// All option
export {
  ALL_OPTION_VALUE,
  ALL_OPTION,
  getOptionLabel,
  omitAllOption,
} from './src/agent_configuration/all_option';

// Amount and unit
export {
  type AmountAndUnit,
  amountAndUnitToObject,
  amountAndUnitToString,
} from './src/agent_configuration/amount_and_unit';

// Runtime types
export {
  serviceSchema,
  settingsSchema,
  agentConfigurationIntakeSchema,
} from './src/agent_configuration/runtime_types/agent_configuration_intake_rt';
export { booleanSchema } from './src/agent_configuration/runtime_types/boolean_rt';
export { captureBodySchema } from './src/agent_configuration/runtime_types/capture_body_rt';
export { logLevelSchema } from './src/agent_configuration/runtime_types/log_level_rt';
export { logEcsReformattingSchema } from './src/agent_configuration/runtime_types/log_ecs_reformatting_rt';
export { traceContinuationStrategySchema } from './src/agent_configuration/runtime_types/trace_continuation_strategy_rt';
export { loggingLevelSchema } from './src/agent_configuration/runtime_types/logging_level_rt';
export { floatThreeDecimalPlacesSchema } from './src/agent_configuration/runtime_types/float_three_decimal_places_rt';
export { floatFourDecimalPlacesSchema } from './src/agent_configuration/runtime_types/float_four_decimal_places_rt';
export { getIntegerSchema } from './src/agent_configuration/runtime_types/integer_rt';
export { getDurationSchema } from './src/agent_configuration/runtime_types/duration_rt';
export { getBytesSchema } from './src/agent_configuration/runtime_types/bytes_rt';
export { getStorageSizeSchema } from './src/agent_configuration/runtime_types/storage_size_rt';
export { getRangeTypeMessage } from './src/agent_configuration/runtime_types/get_range_type_message';

// Setting definitions
export {
  settingDefinitions,
  filterByAgent,
  validateSetting,
} from './src/agent_configuration/setting_definitions';
export type {
  SettingValidation,
  RawSettingDefinition,
  SettingDefinition,
} from './src/agent_configuration/setting_definitions/types';

export { truncate, unit } from './src/utils/style';
export { NOT_AVAILABLE_LABEL } from './src/utils/i18n';
export * from './src/utils/formatters';
export { isFiniteNumber } from './src/utils/is_finite_number';
export { getTimestampUs } from './src/utils/get_timestamp_us';
