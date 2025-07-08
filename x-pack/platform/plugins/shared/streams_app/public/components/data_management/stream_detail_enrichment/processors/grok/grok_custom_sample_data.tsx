/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DraftGrokExpression, SampleInput } from '@kbn/grok-ui';
import React, { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { GrokFormState } from '../../types';
import { useStreamEnrichmentSelector } from '../../state_management/stream_enrichment_state_machine';

export const CustomSampleData = () => {
  const grokCollection = useStreamEnrichmentSelector(
    (machineState) => machineState.context.grokCollection
  );
  const [sample, setSample] = useState<string>('');
  const { control } = useFormContext<GrokFormState>();
  const patterns = useWatch<GrokFormState, 'patterns'>({ control, name: 'patterns' });

  return (
    <SampleInput
      grokCollection={grokCollection}
      draftGrokExpressions={patterns as DraftGrokExpression[]}
      sample={sample}
      onChangeSample={setSample}
    />
  );
};
