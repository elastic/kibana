/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReadKnowledgeBaseResponse } from '@kbn/elastic-assistant-common';
import { KnowledgeBaseConfig } from '../assistant/types';

interface Props {
  enableKnowledgeBaseByDefault: boolean;
  kbStatus: ReadKnowledgeBaseResponse | undefined;
  knowledgeBase: KnowledgeBaseConfig;
  isLoading: boolean;
  isFetching: boolean;
  isSettingUpKB: boolean;
  isDeletingUpKB: boolean;
}

export const useKnowledgeBaseResultStatus = ({
  enableKnowledgeBaseByDefault,
  kbStatus,
  knowledgeBase,
  isLoading,
  isFetching,
  isSettingUpKB,
  isDeletingUpKB,
}: Props) => {
  // Resource enabled state
  const isElserEnabled = kbStatus?.elser_exists ?? false;
  const isKnowledgeBaseEnabled = (kbStatus?.index_exists && kbStatus?.pipeline_exists) ?? false;
  const isESQLEnabled = kbStatus?.esql_exists ?? false;
  const isSetupInProgress = kbStatus?.is_setup_in_progress ?? false;

  // Resource availability state
  const isLoadingKb =
    isLoading || isFetching || isSettingUpKB || isDeletingUpKB || isSetupInProgress;
  const isKnowledgeBaseAvailable = kbStatus?.elser_exists;
  const isESQLAvailable = isKnowledgeBaseAvailable && isKnowledgeBaseEnabled;
  // Prevent enabling if elser doesn't exist, but always allow to disable
  const isSwitchDisabled = enableKnowledgeBaseByDefault ? false : !kbStatus?.elser_exists;

  return {
    isElserEnabled,
    isKnowledgeBaseEnabled,
    isESQLEnabled,
    isSetupInProgress,
    isLoadingKb,
    isKnowledgeBaseAvailable,
    isESQLAvailable,
    isSwitchDisabled,
  };
};
