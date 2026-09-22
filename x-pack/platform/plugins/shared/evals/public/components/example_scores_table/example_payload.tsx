/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, type UseQueryOptions } from '@kbn/react-query';
import { EuiButtonEmpty, EuiCodeBlock, EuiCopy, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type {
  EvaluationExperimentDatasetExample,
  EvaluationScoreDocument,
} from '@kbn/evals-common';
import * as i18n from './translations';

type Scores = EvaluationExperimentDatasetExample['scores'];
export type GetExampleQueryOptions = (
  exampleId: string,
  repetitionIndex: number,
  version?: string
) => Pick<UseQueryOptions<Scores>, 'queryKey' | 'queryFn'>;

const MAX_PREVIEW_CHARACTERS = 10000;
const MAX_PREVIEW_LINES = 100;

export const JsonPreview: React.FC<{
  value: EvaluationScoreDocument['task']['output'] | string;
}> = ({ value }) => {
  const serialized = useMemo(
    () => (typeof value === 'string' ? value : JSON.stringify(value, null, 2)),
    [value]
  );
  if (value == null || !serialized) return <>-</>;
  const preview = serialized
    .slice(0, MAX_PREVIEW_CHARACTERS)
    .split('\n')
    .slice(0, MAX_PREVIEW_LINES)
    .join('\n');
  const truncated = preview.length < serialized.length;
  return (
    <div css={{ width: '100%' }}>
      <EuiCodeBlock
        overflowHeight={200}
        language={typeof value === 'string' ? 'text' : 'json'}
        paddingSize="none"
        transparentBackground
        fontSize="s"
      >
        {preview}
      </EuiCodeBlock>
      {truncated && (
        <EuiText size="xs" color="subdued">
          {i18n.PREVIEW_TRUNCATED}
        </EuiText>
      )}
      <EuiCopy textToCopy={serialized}>
        {(copy) => (
          <EuiButtonEmpty size="xs" iconType="copyClipboard" onClick={copy}>
            {i18n.COPY_JSON}
          </EuiButtonEmpty>
        )}
      </EuiCopy>
    </div>
  );
};

export const ExamplePayload: React.FC<{
  getExampleQueryOptions: GetExampleQueryOptions;
  exampleId: string;
  repetitionIndex: number;
  version?: string;
  children: (scores: Scores) => React.ReactNode;
}> = ({ getExampleQueryOptions, exampleId, repetitionIndex, version, children }) => {
  const {
    data: scores,
    isError,
    refetch,
  } = useQuery({
    ...getExampleQueryOptions(exampleId, repetitionIndex, version),
    staleTime: Infinity,
    cacheTime: 60000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isError)
    return (
      <>
        <EuiText size="xs" color="danger">
          {i18n.PAYLOAD_LOAD_ERROR}
        </EuiText>
        <EuiButtonEmpty
          size="xs"
          onClick={() => {
            refetch();
          }}
        >
          {i18n.RETRY}
        </EuiButtonEmpty>
      </>
    );
  if (!scores) return <EuiLoadingSpinner size="s" />;
  return <>{children(scores)}</>;
};

export const LazyJsonPreview: React.FC<{
  getExampleQueryOptions: GetExampleQueryOptions;
  exampleId: string;
  repetitionIndex: number;
  version?: string;
  field: 'input' | 'output';
}> = ({ getExampleQueryOptions, exampleId, repetitionIndex, version, field }) => {
  const [open, setOpen] = useState(false);
  return (
    <div css={{ width: '100%' }}>
      <EuiButtonEmpty
        size="xs"
        iconType={open ? 'arrowDown' : 'arrowRight'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {field === 'input' ? i18n.VIEW_INPUT : i18n.VIEW_OUTPUT}
      </EuiButtonEmpty>
      {open && (
        <ExamplePayload
          getExampleQueryOptions={getExampleQueryOptions}
          exampleId={exampleId}
          repetitionIndex={repetitionIndex}
          version={version}
        >
          {(scores) => (
            <JsonPreview
              value={field === 'input' ? scores[0]?.example.input : scores[0]?.task.output}
            />
          )}
        </ExamplePayload>
      )}
    </div>
  );
};
