/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import { skippedResult } from '../../evaluator_utils';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_STYLE_EDIT_EVALUATOR_NAME = 'Custom Content Style Edit';

const STYLE_EDIT_CRITERIA = [
  'The template after the edit does what the instruction asks for. Colors are theme tokens, not hex values: var(--cc-color-primary) is the theme blue, var(--cc-color-danger) is red, var(--cc-color-warning) is yellow or orange, and var(--cc-vis-0) to var(--cc-vis-9) are the data colors. Using the token of the requested color counts as that color.',
  'Styling the instruction does not mention stays as it was, and the text, the layout and the data bindings are unchanged.',
];

/**
 * A judge for style edits. A color or size cannot be checked in code, because generated templates
 * use theme tokens (`var(--cc-color-primary)`), so a model compares the template before and after
 * the follow-up with the instruction.
 */
export const createStyleEditJudge = ({
  criteria,
}: {
  criteria: DefaultEvaluators['criteria'];
}): CustomContentEvaluator => {
  const judge: Evaluator = criteria(STYLE_EDIT_CRITERIA);

  return {
    name: CUSTOM_CONTENT_STYLE_EDIT_EVALUATOR_NAME,
    kind: 'LLM',
    direction: 'maximize',
    getModel: judge.getModel,
    evaluate: async ({ input, output, expected, metadata }) => {
      const before = output.baseline?.content?.template;
      const after = output.after?.template;
      if (expected?.edit !== 'style' || !input?.followUp) {
        return skippedResult('This example is not a style edit.');
      }
      if (!before || !after) {
        return skippedResult('There is no template from before and after the follow-up.');
      }

      return judge.evaluate({
        input: { instruction: input.followUp },
        output: { templateBefore: before, templateAfter: after },
        expected,
        metadata,
      });
    },
  };
};
