/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtractObservablesSource } from './types/case';

/**
 * Finds where the stored `settings.extractObservables` value came from.
 *
 * The baseline is the value the case gets when nobody chooses: the template value if the template
 * sets one, else the space or owner default. A chosen value that equals the baseline keeps the
 * baseline source. Only a chosen value that differs from the baseline gets `chosenSource`.
 * This way a create form that always sends the default value does not count as a choice.
 */
export const getExtractObservablesSource = ({
  chosenValue,
  chosenSource,
  templateValue,
  defaultValue,
}: {
  /** The value that a caller or a rule chose. `null` or `undefined` when nobody chose a value. */
  chosenValue: boolean | null | undefined;
  /** The source to report when the chosen value differs from the baseline. */
  chosenSource: Extract<ExtractObservablesSource, 'explicit' | 'rule'>;
  /** The value from the template definition, or `undefined` when there is no value. */
  templateValue: boolean | undefined;
  /** The value that the space configuration or the owner gives. */
  defaultValue: boolean;
}): ExtractObservablesSource => {
  const baselineSource: ExtractObservablesSource =
    templateValue !== undefined ? 'template' : 'space_default';
  const baselineValue = templateValue ?? defaultValue;

  if (chosenValue == null || chosenValue === baselineValue) {
    return baselineSource;
  }

  return chosenSource;
};
