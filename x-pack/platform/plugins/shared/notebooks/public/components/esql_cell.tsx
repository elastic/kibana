/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { EsqlCellDefinition } from '../../common/types';
import { CellFrame } from './cell_frame';
import { useNotebook } from './notebook_context';
import { ResultPreview } from './result_preview';

const LazyEsqlEditor = React.lazy(async () => {
  const { ESQLLangEditor } = await import('@kbn/esql/public');
  return { default: ESQLLangEditor };
});

export const EsqlCell = ({ cell }: { cell: EsqlCellDefinition }) => {
  const { store, scheduler } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const [draft, setDraft] = useState(cell.query);

  useEffect(() => setDraft(cell.query), [cell.query]);
  useEffect(
    () => scheduler.markEdited(cell.id, draft !== cell.query),
    [scheduler, cell.id, cell.query, draft]
  );

  const run = async (query: string): Promise<void> => {
    store.updateCell(cell.id, (current) =>
      current.type === 'esql' ? { ...current, query } : current
    );
    await scheduler.runCell(cell.id);
  };

  const { output } = runtime;

  return (
    <CellFrame cell={cell} runtime={runtime} onRun={() => run(draft)} outputs={[cell.name]}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyEsqlEditor
          query={{ esql: draft }}
          onTextLangQueryChange={({ esql }) => setDraft(esql)}
          onTextLangQuerySubmit={(query) => run(query?.esql ?? draft)}
          isLoading={runtime.status === 'running'}
          editorIsInline
          hideRunQueryButton
          hideQueryHistory
          hideQuickSearch
          disableAutoFocus
          expandToFitQueryOnMount
          dataTestSubj={`notebookEsqlEditor-${cell.name}`}
        />
      </Suspense>
      {output?.kind === 'table' && (
        <>
          <EuiSpacer size="s" />
          <ResultPreview
            id={cell.id}
            table={output.table}
            truncated={output.truncated}
            durationMs={runtime.durationMs}
          />
        </>
      )}
    </CellFrame>
  );
};
