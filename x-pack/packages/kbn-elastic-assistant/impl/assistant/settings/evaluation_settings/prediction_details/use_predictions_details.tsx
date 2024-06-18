/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption, euiPaletteComplementary } from '@elastic/eui';
import { useCallback, useState, useMemo } from 'react';
import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { HttpSetup } from '@kbn/core/public';
import type { GetEvaluateResponse } from '@kbn/elastic-assistant-common';
import { AIConnector } from '../../../../connectorland/connector_selector';
import { getActionTypeTitle, getGenAiConfig } from '../../../../connectorland/helpers';
import { PRECONFIGURED_CONNECTOR } from '../../../../connectorland/translations';
import { useEvaluationData } from '../../../api/evaluate/use_evaluation_data';

interface Props {
  actionTypeRegistry: ActionTypeRegistryContract;
  connectors: AIConnector[] | undefined;
  http: HttpSetup;
}

export interface PredictionsSettings {
  modelOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedModelOptions: Array<EuiComboBoxOptionOption<string>>;
  onModelOptionsChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  agentOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedAgentOptions: Array<EuiComboBoxOptionOption<string>>;
  onAgentOptionsChange: (agentOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  onAgentOptionsCreate: (searchValue: string) => void;
}

export const usePredictionsDetails = ({
  http,
  connectors,
  actionTypeRegistry,
}: Props): PredictionsSettings => {
  const { data: evalData } = useEvaluationData({ http });
  const defaultAgents = useMemo(
    () => (evalData as GetEvaluateResponse)?.agentExecutors ?? [],
    [evalData]
  );

  // Predictions
  // Connectors / Models
  const [selectedModelOptions, setSelectedModelOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onModelOptionsChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedModelOptions(selectedOptions);
    },
    [setSelectedModelOptions]
  );
  const visColorsBehindText = euiPaletteComplementary(connectors?.length ?? 0);
  const modelOptions = useMemo(() => {
    return (
      connectors?.map((c, index) => {
        const apiProvider = getGenAiConfig(c)?.apiProvider;
        const connectorTypeTitle =
          apiProvider ?? getActionTypeTitle(actionTypeRegistry.get(c.actionTypeId));
        const connectorDetails = c.isPreconfigured ? PRECONFIGURED_CONNECTOR : connectorTypeTitle;
        return {
          key: c.id,
          label: `${c.name} (${connectorDetails})`,
          color: visColorsBehindText[index],
        };
      }) ?? []
    );
  }, [actionTypeRegistry, connectors, visColorsBehindText]);

  // Agents
  const [selectedAgentOptions, setSelectedAgentOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onAgentOptionsChange = useCallback(
    (agentOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedAgentOptions(agentOptions);
    },
    [setSelectedAgentOptions]
  );
  const onAgentOptionsCreate = useCallback(
    (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim();

      if (!normalizedSearchValue) {
        return;
      }

      setSelectedAgentOptions([...selectedAgentOptions, { label: normalizedSearchValue }]);
    },
    [selectedAgentOptions]
  );
  const agentOptions = useMemo(() => {
    return defaultAgents.map((label) => ({ label }));
  }, [defaultAgents]);

  return {
    modelOptions,
    selectedModelOptions,
    onModelOptionsChange,
    agentOptions,
    selectedAgentOptions,
    onAgentOptionsChange,
    onAgentOptionsCreate,
  };
};
