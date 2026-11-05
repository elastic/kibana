/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { CodeEditor, ESQL_LANG_ID, monaco } from '@kbn/code-editor';
import type { CannedQueryParam, EsqlParam, EsqlParamType } from '../../../common/types';
import { resolveParams } from '../lib/resolve_params';
import type { QueryViewState } from '../lib/query_url_state';
import { i18nTexts } from '../translations';

const PARAM_TYPES: readonly EsqlParamType[] = ['string', 'number', 'boolean'];

interface EsqlQueryFormProps {
  readonly query: string;
  /** When false the query is shown read-only, as for canned queries. */
  readonly editable: boolean;
  readonly declaredParams: readonly CannedQueryParam[];
  readonly urlState: QueryViewState;
  readonly isRunning: boolean;
  readonly onSubmit: (query: string, params: EsqlParam[]) => void;
}

/** ES|QL editor (or read-only view) with inputs for each `?name` parameter and a run button. */
export function EsqlQueryForm({
  query: initialQuery,
  editable,
  declaredParams,
  urlState,
  isRunning,
  onSubmit,
}: EsqlQueryFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [values, setValues] = useState(urlState.values);
  const [types, setTypes] = useState(urlState.types);

  useEffect(() => {
    setQuery(initialQuery);
    setValues(urlState.values);
    setTypes(urlState.types);
  }, [initialQuery, urlState]);

  const params = resolveParams(query, declaredParams, values, types);

  function submit() {
    onSubmit(query, params);
  }

  // The editor keybinding is registered once on mount, so it calls the latest submit via a ref.
  const submitRef = useRef(submit);
  submitRef.current = submit;

  return (
    <EuiPanel hasBorder paddingSize="m">
      {editable ? (
        <div data-test-subj="indexExplorerEsqlEditor">
          <CodeEditor
            languageId={ESQL_LANG_ID}
            value={query}
            onChange={setQuery}
            height={200}
            aria-label={i18nTexts.esqlEditorLabel}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
            editorDidMount={(editor) => {
              editor.addAction({
                id: 'indexExplorer.runQuery',
                label: i18nTexts.runQuery,
                // KeyMod and KeyCode occupy disjoint bits, so adding them combines the flags.
                keybindings: [monaco.KeyMod.CtrlCmd + monaco.KeyCode.Enter],
                run: () => submitRef.current(),
              });
            }}
          />
        </div>
      ) : (
        <EuiCodeBlock
          language="esql"
          isCopyable
          paddingSize="s"
          data-test-subj="indexExplorerEsqlQuery"
        >
          {query}
        </EuiCodeBlock>
      )}
      {params.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGrid columns={3} gutterSize="s">
            {params.map(({ name, type, value }) => {
              const isDeclared = declaredParams.some((param) => param.name === name);
              return (
                <EuiFlexItem key={name}>
                  <EuiFormRow label={`?${name}`} fullWidth>
                    <EuiFieldText
                      fullWidth
                      compressed
                      value={value}
                      onChange={(event) => setValues({ ...values, [name]: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          submit();
                        }
                      }}
                      prepend={
                        isDeclared ? (
                          type
                        ) : (
                          <EuiSelect
                            compressed
                            aria-label={i18nTexts.paramTypeLabel(name)}
                            options={PARAM_TYPES.map((candidate) => ({
                              value: candidate,
                              text: candidate,
                            }))}
                            value={type}
                            onChange={(event) => {
                              const selected = PARAM_TYPES.find(
                                (candidate) => candidate === event.target.value
                              );
                              setTypes({ ...types, [name]: selected ?? 'string' });
                            }}
                          />
                        )
                      }
                      data-test-subj={`indexExplorerEsqlParam-${name}`}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGrid>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiButton
        fill
        iconType="play"
        onClick={submit}
        isLoading={isRunning}
        isDisabled={query.trim().length === 0}
        data-test-subj="indexExplorerRunQuery"
      >
        {i18nTexts.runQuery}
      </EuiButton>
    </EuiPanel>
  );
}
