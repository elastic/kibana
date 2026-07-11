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
export {
  AgentConfigurationPageStep,
  agentConfigurationPageStepRt,
} from './src/agent_configuration/constants';

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
  serviceRt,
  serviceSchema,
  settingsRt,
  settingsSchema,
  agentConfigurationIntakeRt,
  agentConfigurationIntakeSchema,
} from './src/agent_configuration/runtime_types/agent_configuration_intake_rt';
export { booleanRt } from './src/agent_configuration/runtime_types/boolean_rt';
export { captureBodyRt } from './src/agent_configuration/runtime_types/capture_body_rt';
export { logLevelRt } from './src/agent_configuration/runtime_types/log_level_rt';
export { logEcsReformattingRt } from './src/agent_configuration/runtime_types/log_ecs_reformatting_rt';
export { traceContinuationStrategyRt } from './src/agent_configuration/runtime_types/trace_continuation_strategy_rt';
export { loggingLevelRt } from './src/agent_configuration/runtime_types/logging_level_rt';
export { floatThreeDecimalPlacesRt } from './src/agent_configuration/runtime_types/float_three_decimal_places_rt';
export { floatFourDecimalPlacesRt } from './src/agent_configuration/runtime_types/float_four_decimal_places_rt';
export { getIntegerRt } from './src/agent_configuration/runtime_types/integer_rt';
export { getDurationRt } from './src/agent_configuration/runtime_types/duration_rt';
export { getBytesRt } from './src/agent_configuration/runtime_types/bytes_rt';
export { getStorageSizeRt } from './src/agent_configuration/runtime_types/storage_size_rt';
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
