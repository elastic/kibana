/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiSelect } from '@elastic/eui';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

export interface KbModel {
  modelId: string;
  taskType: InferenceTaskType;
}

export function SelectKnowledgeBaseModel({
  onSelectKbModel,
  kbModel,
}: {
  onSelectKbModel: (model: KbModel) => void;
  kbModel: KbModel | undefined;
}) {
  const kbModels: Array<KbModel & { label: string }> = useMemo(
    () => [
      {
        label: 'ELSER v2 (English-only)',
        modelId: '.elser_model_2', // TODO: should use `.elser_model_2_linux-x86_64` on linux
        taskType: 'sparse_embedding',
      },
      {
        label: 'E5 Small (Multilingual)',
        modelId: '.multilingual-e5-small',
        taskType: 'text_embedding',
      },
    ],
    []
  );

  useEffect(() => {
    if (!kbModel) {
      onSelectKbModel(kbModels[0]);
    }
  }, [kbModel, onSelectKbModel, kbModels]);

  return (
    <EuiSelect
      fullWidth
      data-test-subj="observabilityAiAssistantKbModelSelect"
      options={kbModels.map(({ label, modelId }) => ({ value: modelId, text: label }))}
      onChange={(event) => {
        const selectedModel = kbModels.find(({ modelId }) => modelId === event.target.value)!;
        onSelectKbModel(selectedModel);
      }}
      value={kbModel?.modelId}
    />
  );
}
