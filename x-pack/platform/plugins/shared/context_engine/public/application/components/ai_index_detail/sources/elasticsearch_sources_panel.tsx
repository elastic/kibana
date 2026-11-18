/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLLangEditor } from '@kbn/esql/public';
import React, { useCallback } from 'react';
import { isIndexPickerSourceSelected } from '../../../utils/sources';
import { IndexMultiSelect } from './index_multi_select';
import type { SelectedSource } from './types';

const EDITOR_INLINE_MIN_HEIGHT = 180;

const getEsqlQuery = (query: AggregateQuery): string => ('esql' in query ? query.esql : '');

export type ElasticsearchSourceMode = 'index' | 'esql';

interface ElasticsearchSourcesPanelProps {
  savedSources: SelectedSource[];
  pendingIndexNames: string[];
  onToggleIndex: (indexName: string, checked: boolean) => void;
  esqlQuery: string;
  onEsqlQueryChange: (query: string) => void;
  disabled?: boolean;
  mode?: ElasticsearchSourceMode;
}

export const ElasticsearchSourcesPanel = ({
  savedSources,
  pendingIndexNames,
  onToggleIndex,
  esqlQuery,
  onEsqlQueryChange,
  disabled = false,
  mode = 'index',
}: ElasticsearchSourcesPanelProps) => {
  const isIndexSaved = useCallback(
    (indexName: string) => isIndexPickerSourceSelected(savedSources, indexName),
    [savedSources]
  );

  return (
    <div data-test-subj="contextElasticsearchSourcesPanel">
      {mode === 'index' ? (
        <IndexMultiSelect
          isIndexSaved={isIndexSaved}
          pendingIndexNames={pendingIndexNames}
          onToggle={onToggleIndex}
          disabled={disabled}
        />
      ) : (
        <div data-test-subj="contextAdvancedEsqlEditor">
          <EuiFormRow fullWidth>
            <div css={{ minHeight: EDITOR_INLINE_MIN_HEIGHT }}>
              <ESQLLangEditor
                query={{ esql: esqlQuery }}
                onTextLangQueryChange={(next) => onEsqlQueryChange(getEsqlQuery(next))}
                onTextLangQuerySubmit={async () => {}}
                editorIsInline
                hasOutline
                hideRunQueryButton
                hideQueryHistory
                expandToFitQueryOnMount
                isLoading={false}
              />
            </div>
          </EuiFormRow>
        </div>
      )}
    </div>
  );
};
