/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import mustache from 'mustache';
import lowPowerMetaPrompt from './prompts/low_power_meta_prompt.text';
import mediumPowerMetaPrompt from './prompts/medium_power_meta_prompt.text';
import highPowerMetaPrompt from './prompts/high_power_meta_prompt.text';

export async function generateReasoningPrompts({
  taskDescriptionTemplate,
  inferenceClient,
}: {
  taskDescriptionTemplate: string;
  inferenceClient: BoundInferenceClient;
}) {
  const powers = ['low', 'medium', 'high'] as const;

  const prompts = [lowPowerMetaPrompt, mediumPowerMetaPrompt, highPowerMetaPrompt];

  const indices = Object.fromEntries(powers.map((power, idx) => [power, idx]));

  const outputs = await Promise.all(
    powers.map(async (power) => {
      const powerIndex = powers.indexOf(power);

      const view = {
        atLeastMediumPower: powerIndex >= indices.medium,
        atMostMediumPower: powerIndex <= indices.medium,
        lowPower: powerIndex === indices.low,
        mediumPower: powerIndex === indices.medium,
        highPower: powerIndex === indices.high,
      };

      const prompt = [prompts[powerIndex]].join();

      const input = [
        prompt,
        mustache.render(taskDescriptionTemplate, view),
        `Do not preface your output with any intro or summary. Directly output the prompt. Do not create a distinction between a user and a system prompt.`,
      ].join('\n\n');

      const response = await inferenceClient.output({
        id: `generate_${power}_power_system_prompt`,
        input,
      });

      return response.content;
    })
  );

  return powers
    .map((power) => {
      return `{{#power.${power}}}\n\n${outputs[indices[power]]}\n\n{{/power.${power}}}`;
    })
    .join('\n\n');
}
