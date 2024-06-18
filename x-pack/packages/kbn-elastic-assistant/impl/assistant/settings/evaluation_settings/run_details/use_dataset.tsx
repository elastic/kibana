/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';

export interface DataSetSettings {
  onUseLangSmith: () => void;
  onUseCustom: () => void;
  useLangSmithDataset: boolean;
  datasetName: string | undefined;
  onDatasetNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  datasetText: string;
  onDatasetTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const useDataset = (): DataSetSettings => {
  /** Dataset **/
  const [useLangSmithDataset, setUseLangSmithDataset] = useState(true);

  const [datasetName, setDatasetName] = useState<string>();
  const onDatasetNameChange = useCallback(
    (e) => {
      setDatasetName(e.target.value);
    },
    [setDatasetName]
  );
  const sampleDataset = [
    {
      input:
        'As an expert user of Elastic Security, please generate an accurate and valid ESQL query to detect the use case below. Your response should be formatted to be able to use immediately in an Elastic Security timeline or detection rule. Take your time with the answer, and really make sure you check your knowledge really well on all the functions I am asking for. check it multiple times if you need to. I cannot afford for queries to be inaccurate. Assume I am using the Elastic Common Schema. Ensure the answers are formatted in a way which is easily copyable.\n\n' +
        'Write an ESQL query for detecting cryptomining activity on an AWS EC2 instance.',
      reference:
        'FROM metrics-apm*\n| WHERE metricset.name == ""transaction"" AND metricset.interval == ""1m""\n| EVAL bucket = AUTO_BUCKET(transaction.duration.histogram, 50, <start-date>, <end-date>)\n| STATS avg_duration = AVG(transaction.duration.histogram) BY bucket',
    },
  ];
  const [datasetText, setDatasetText] = useState<string>(JSON.stringify(sampleDataset, null, 2));
  const onDatasetTextChange = useCallback(
    (e) => {
      setDatasetText(e.target.value);
    },
    [setDatasetText]
  );

  const onUseLangSmith = useCallback(() => {
    setUseLangSmithDataset(true);
  }, []);

  const onUseCustom = useCallback(() => {
    setUseLangSmithDataset(false);
  }, []);

  return {
    onUseLangSmith,
    onUseCustom,
    useLangSmithDataset,
    datasetName,
    onDatasetNameChange,
    datasetText,
    onDatasetTextChange,
  };
};
