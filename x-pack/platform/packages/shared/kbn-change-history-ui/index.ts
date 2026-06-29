/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type * from './src/types';
export { createChangeHistoryHttpAdapter } from './src/adapters';
export type { ChangeHistoryHttpAdapterConfig } from './src/adapters';
export { DEFAULT_CHANGE_HISTORY_PAGE_SIZE } from './src/types';
export {
  ChangeHistoryModal,
  ChangeHistoryTrigger,
  ChangeHistoryListGroupItem,
  ChangeHistoryPreviewPanel,
  ChangeHistoryRestoreButton,
  ChangeHistoryDefaultPreviewHeaderActions,
} from './src/components/modal';
export type { ChangeHistoryRestoreButtonProps } from './src/components/modal';
export { ChangeHistoryProvider, useChangeHistoryConfig } from './src/provider';
export type { ChangeHistoryProviderProps, ChangeHistoryConfigValue } from './src/provider';
export { useChangeHistoryList, useChangeHistoryDetail, useChangeHistoryRestore } from './src/hooks';
export {
  getChangeHistoryErrorCode,
  getChangeHistoryErrorCodeFromBody,
} from './src/utils/get_change_history_error_code';
export { isChangeHistoryErrorCode } from './src/utils/change_history_error_codes';
export type {
  UseChangeHistoryListArgs,
  UseChangeHistoryListResult,
  UseChangeHistoryDetailArgs,
  UseChangeHistoryDetailResult,
  UseChangeHistoryRestoreResult,
} from './src/hooks';
