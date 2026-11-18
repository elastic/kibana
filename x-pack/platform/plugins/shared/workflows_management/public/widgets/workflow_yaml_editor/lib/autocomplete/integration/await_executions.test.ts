/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/code-editor';
import { createMockWorkflowContextRegistry } from '../../../../../../common/lib/create_workflow_context_registry.mock';
import { getFakeAutocompleteContextParams } from '../context/build_autocomplete_context.test';
import { getCompletionItemProvider } from '../get_completion_item_provider';

const emptyRegistry = createMockWorkflowContextRegistry();

async function getSuggestions(yamlContent: string): Promise<monaco.languages.CompletionItem[]> {
  const params = getFakeAutocompleteContextParams(yamlContent);
  const completionProvider = getCompletionItemProvider(emptyRegistry, () => params.editorState);
  const result = await completionProvider.provideCompletionItems(
    params.model,
    params.position,
    params.completionContext,
    { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) }
  );
  return result?.suggestions ?? [];
}

const getSuggestionLabels = async (yamlContent: string): Promise<string[]> =>
  (await getSuggestions(yamlContent)).map(({ label }) => label as string);

const STEPS = `
steps:
  - name: fan_out
    type: parallel
    foreach: '["a"]'
    steps:
      - name: scan
        type: workflow.executeAsync
        with:
          workflow-id: child
  - name: log
    type: console
    with:
      message: hi
  - name: enrich
    type: workflow.executeAsync
    with:
      workflow-id: child`;

describe('getCompletionItemProvider - workflow.awaitExecutions from-steps', () => {
  it('suggests earlier steps that start executions in a block list', async () => {
    const labels = await getSuggestionLabels(`${STEPS}
  - name: join
    type: workflow.awaitExecutions
    with:
      from-steps:
        - |<-`);

    expect(labels).toEqual(['fan_out', 'scan', 'enrich']);
  });

  it('leaves out steps that are already listed', async () => {
    const labels = await getSuggestionLabels(`${STEPS}
  - name: join
    type: workflow.awaitExecutions
    with:
      from-steps: [fan_out, |<-]`);

    expect(labels).toEqual(['scan', 'enrich']);
  });

  it('inserts a list when from-steps has no value yet', async () => {
    const suggestions = await getSuggestions(`${STEPS}
  - name: join
    type: workflow.awaitExecutions
    with:
      from-steps: |<-`);

    expect(suggestions.map(({ insertText }) => insertText)).toEqual([
      '[fan_out]',
      '[scan]',
      '[enrich]',
    ]);
  });
});
