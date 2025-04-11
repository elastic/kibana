/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiSelect } from '@elastic/eui';

export function SelectKnowledgeBaseModel({
  onSelectInferenceId,
  inferenceId,
}: {
  onSelectInferenceId: (inferenceId: string) => void;
  inferenceId: string;
}) {
  const inferenceEndpoints: Array<{ id: string; label: string }> = useMemo(
    () => [
      {
        label: 'ELSER v2 (English-only)',
        id: '.elser-2-elasticsearch',
      },
      {
        label: 'E5 Small (Multilingual)',
        id: '.multilingual-e5-small-elasticsearch',
      },
    ],
    []
  );

  useEffect(() => {
    if (!inferenceId) {
      onSelectInferenceId(inferenceEndpoints[0].id);
    }
  }, [inferenceId, inferenceEndpoints, onSelectInferenceId]);

  return (
    <EuiSelect
      fullWidth
      data-test-subj="observabilityAiAssistantKbModelSelect"
      options={inferenceEndpoints.map(({ label, id }) => ({ value: id, text: label }))}
      onChange={(event) => {
        const inferenceEndpoint = inferenceEndpoints.find(({ id }) => id === event.target.value)!;
        onSelectInferenceId(inferenceEndpoint.id);
      }}
      value={inferenceId}
    />
  );
}
