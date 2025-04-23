/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { AssistantTelemetry } from '../../../..';
import type { KnowledgeBaseConfig } from '../../types';

interface Params {
  assistantTelemetry?: AssistantTelemetry;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig | undefined>>;
  knowledgeBase: KnowledgeBaseConfig;
}
interface KnowledgeBaseUpdater {
  knowledgeBaseSettings: KnowledgeBaseConfig;
  resetKnowledgeBaseSettings: () => void;
  saveKnowledgeBaseSettings: () => boolean;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
}

export const useKnowledgeBaseUpdater = ({
  assistantTelemetry,
  knowledgeBase,
  setKnowledgeBase,
}: Params): KnowledgeBaseUpdater => {
  const [knowledgeBaseSettings, setUpdatedKnowledgeBaseSettings] =
    useState<KnowledgeBaseConfig>(knowledgeBase);

  const resetKnowledgeBaseSettings = useCallback((): void => {
    setUpdatedKnowledgeBaseSettings(knowledgeBase);
  }, [knowledgeBase]);

  const saveKnowledgeBaseSettings = useCallback(() => {
    const didUpdateAlertsCount = knowledgeBase.latestAlerts !== knowledgeBaseSettings.latestAlerts;
    if (didUpdateAlertsCount) {
      assistantTelemetry?.reportAssistantSettingToggled({
        alertsCountUpdated: didUpdateAlertsCount,
      });
    }
    setKnowledgeBase(knowledgeBaseSettings);
    return true;
  }, [assistantTelemetry, knowledgeBase.latestAlerts, knowledgeBaseSettings, setKnowledgeBase]);
  return {
    knowledgeBaseSettings,
    resetKnowledgeBaseSettings,
    saveKnowledgeBaseSettings,
    setUpdatedKnowledgeBaseSettings,
  };
};
