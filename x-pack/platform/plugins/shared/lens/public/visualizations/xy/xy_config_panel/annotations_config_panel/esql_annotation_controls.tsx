/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ESQLLangEditor } from '@kbn/esql/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { EsqlEventAnnotationConfig } from '@kbn/event-annotation-common';
import { ConfigPanelEsqlAnnotation } from '@kbn/event-annotation-components';
import { ESQLDataGridAccordion } from '../../../../app_plugin/shared/edit_on_the_fly/esql_data_grid_accordion';
import type { ESQLDataGridAttrs } from '../../../../app_plugin/shared/edit_on_the_fly/helpers';

interface Props {
  annotation: EsqlEventAnnotationConfig;
  onChange: (annotation: EsqlEventAnnotationConfig) => void;
  fetchColumns: (
    query: AggregateQuery,
    abortSignal: AbortSignal
  ) => Promise<{ columns: DatatableColumn[]; timeField?: string }>;
  /** Reports the result columns of the saved query whenever they change; `undefined` until they are known. */
  onColumnsChange?: (columns: DatatableColumn[] | undefined) => void;
  /** Runs the saved query for the results accordion; no accordion is shown without it. */
  fetchResults?: (
    query: AggregateQuery,
    abortController: AbortController
  ) => Promise<ESQLDataGridAttrs>;
  isApproximate?: boolean;
}

const noop = () => {};

export const EsqlAnnotationControls = ({
  annotation,
  onChange,
  fetchColumns,
  onColumnsChange,
  fetchResults,
  isApproximate = false,
}: Props) => {
  const [query, setQuery] = useState(annotation.query);
  // `undefined` until the columns of the saved query arrive, so bound fields are not flagged as missing
  const [columns, setColumns] = useState<DatatableColumn[] | undefined>(
    annotation.query.esql.trim() ? undefined : []
  );
  const [errors, setErrors] = useState<Error[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataGridAttrs, setDataGridAttrs] = useState<ESQLDataGridAttrs>();
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const requestRef = useRef<AbortController>();
  const loadedResultRef = useRef<{ query: string; fetchColumns: Props['fetchColumns'] }>();
  const currentPropsRef = useRef({ annotation, onChange });
  currentPropsRef.current = { annotation, onChange };

  // The editor's text decoration lives outside this component and needs the result columns
  useEffect(() => onColumnsChange?.(columns), [columns, onColumnsChange]);

  const savedQuery = annotation.query.esql;
  useEffect(() => setQuery({ esql: savedQuery }), [savedQuery]);

  // Like the data layer editor, the results of the saved query back an accordion below the
  // editor. Query errors are already reported by the column fetch, so a failure here only
  // hides the accordion.
  useEffect(() => {
    if (!fetchResults || !savedQuery.trim()) {
      setDataGridAttrs(undefined);
      return;
    }
    const controller = new AbortController();
    fetchResults({ esql: savedQuery }, controller)
      .then((attrs) => {
        if (!controller.signal.aborted) setDataGridAttrs(attrs);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDataGridAttrs(undefined);
      });
    return () => controller.abort();
  }, [savedQuery, fetchResults]);

  useEffect(() => {
    if (
      !savedQuery.trim() ||
      (loadedResultRef.current?.query === savedQuery &&
        loadedResultRef.current.fetchColumns === fetchColumns)
    ) {
      return;
    }
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setIsLoading(true);
    setErrors([]);
    fetchColumns({ esql: savedQuery }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setColumns(result.columns);
        loadedResultRef.current = { query: savedQuery, fetchColumns };
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setColumns([]);
        setErrors([error instanceof Error ? error : new Error(String(error))]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [savedQuery, fetchColumns]);

  useEffect(() => () => requestRef.current?.abort(), []);

  return (
    <ConfigPanelEsqlAnnotation
      annotation={annotation}
      columns={columns ?? []}
      isLoadingColumns={columns === undefined}
      onChange={onChange}
      queryResults={
        dataGridAttrs ? (
          <ESQLDataGridAccordion
            dataGridAttrs={dataGridAttrs}
            query={annotation.query}
            isAccordionOpen={isResultsOpen}
            setIsAccordionOpen={setIsResultsOpen}
            onAccordionToggleCb={noop}
            isTableView
            isApproximate={isApproximate}
            isEmbedded
          />
        ) : null
      }
      queryEditor={
        // the editor renders its run button outside of `dataTestSubj`, so tests scope to this wrapper
        <div data-test-subj="lnsXY-annotation-esql-query">
          <ESQLLangEditor
            query={query}
            onTextLangQueryChange={setQuery}
            onTextLangQuerySubmit={async (submittedQuery, controller = new AbortController()) => {
              if (!submittedQuery?.esql.trim()) return;
              requestRef.current?.abort();
              requestRef.current = controller;
              setIsLoading(true);
              setErrors([]);
              try {
                const result = await fetchColumns(submittedQuery, controller.signal);
                if (controller.signal.aborted) return;
                loadedResultRef.current = { query: submittedQuery.esql, fetchColumns };
                setColumns(result.columns);
                const current = currentPropsRef.current;
                current.onChange({
                  ...current.annotation,
                  query: submittedQuery,
                  timeField: result.timeField,
                });
              } catch (error) {
                if (controller.signal.aborted) return;
                setErrors([error instanceof Error ? error : new Error(String(error))]);
              } finally {
                if (requestRef.current === controller) setIsLoading(false);
              }
            }}
            errors={errors}
            isLoading={isLoading}
            editorIsInline
            allowQueryCancellation
            dataTestSubj="lnsXY-annotation-esql-editor"
          />
        </div>
      }
    />
  );
};
