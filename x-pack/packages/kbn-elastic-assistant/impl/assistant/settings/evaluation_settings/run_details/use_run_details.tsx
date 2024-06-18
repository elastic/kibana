/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';

const DEFAULT_OUTPUT_INDEX = '.kibana-elastic-ai-assistant-evaluation-results';

export interface RunDetailsSettings {
  projectName: string | undefined;
  onProjectNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  runName: string | undefined;
  onRunNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  outputIndex: string;
  onOutputIndexChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const useRunDetails = (): RunDetailsSettings => {
  // Run Details
  // Project Name
  const [projectName, setProjectName] = useState();
  const onProjectNameChange = useCallback(
    (e) => {
      setProjectName(e.target.value);
    },
    [setProjectName]
  );
  // Run Name
  const [runName, setRunName] = useState<string>();
  const onRunNameChange = useCallback(
    (e) => {
      setRunName(e.target.value);
    },
    [setRunName]
  );
  // Local Output Index
  const [outputIndex, setOutputIndex] = useState(DEFAULT_OUTPUT_INDEX);
  const onOutputIndexChange = useCallback(
    (e) => {
      setOutputIndex(e.target.value);
    },
    [setOutputIndex]
  );

  return {
    projectName,
    onProjectNameChange,
    runName,
    onRunNameChange,
    outputIndex,
    onOutputIndexChange,
  };
};
