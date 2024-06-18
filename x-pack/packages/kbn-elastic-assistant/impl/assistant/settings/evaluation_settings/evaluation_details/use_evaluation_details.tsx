/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { useCallback, useMemo, useState } from 'react';

const DEFAULT_EVAL_TYPES_OPTIONS = [
  { label: 'correctness' },
  { label: 'esql-validator', disabled: true },
  { label: 'custom', disabled: true },
];

export interface EvaluationSettings {
  selectedEvaluationType: Array<EuiComboBoxOptionOption<string>>;
  onEvaluationTypeChange: (evaluationType: Array<EuiComboBoxOptionOption<string>>) => void;
  onEvaluationTypeOptionsCreate: (searchValue: string) => void;
  evaluationTypeOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedEvaluatorModelOptions: Array<EuiComboBoxOptionOption<string>>;
  onEvaluatorModelOptionsChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  evalPrompt: string;
  onEvalPromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const useEvaluationDetails = (): EvaluationSettings => {
  // Evaluation
  // Evaluation Type
  const [selectedEvaluationType, setSelectedEvaluationType] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onEvaluationTypeChange = useCallback(
    (evaluationType: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedEvaluationType(evaluationType);
    },
    [setSelectedEvaluationType]
  );
  const onEvaluationTypeOptionsCreate = useCallback(
    (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim();

      if (!normalizedSearchValue) {
        return;
      }

      setSelectedEvaluationType([{ label: normalizedSearchValue }]);
    },
    [setSelectedEvaluationType]
  );
  const evaluationTypeOptions = useMemo(() => {
    return DEFAULT_EVAL_TYPES_OPTIONS;
  }, []);

  // Eval Model
  const [selectedEvaluatorModelOptions, setSelectedEvaluatorModelOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onEvaluatorModelOptionsChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedEvaluatorModelOptions(selectedOptions);
    },
    [setSelectedEvaluatorModelOptions]
  );

  // Eval Prompt
  const sampleEvalPrompt: string = `For the below input: \n\n{{input}} \n\na prediction: \n\n{{prediction}} \n\nwas made. How's it stack up against this reference: \n\n{{reference}} \n\nReturn output in a succinct sentence ranking on a simple grading rubric focused on correctness.`;
  const [evalPrompt, setEvalPrompt] = useState<string>(sampleEvalPrompt);
  const onEvalPromptChange = useCallback(
    (e) => {
      setEvalPrompt(e.target.value);
    },
    [setEvalPrompt]
  );

  return {
    selectedEvaluationType,
    onEvaluationTypeChange,
    onEvaluationTypeOptionsCreate,
    evaluationTypeOptions,
    selectedEvaluatorModelOptions,
    onEvaluatorModelOptionsChange,
    evalPrompt,
    onEvalPromptChange,
  };
};
