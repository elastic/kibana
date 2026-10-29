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

interface Props {
  annotation: EsqlEventAnnotationConfig;
  onChange: (annotation: EsqlEventAnnotationConfig) => void;
  fetchColumns: (query: AggregateQuery, abortSignal: AbortSignal) => Promise<DatatableColumn[]>;
}

export const EsqlAnnotationControls = ({ annotation, onChange, fetchColumns }: Props) => {
  const [query, setQuery] = useState(annotation.query);
  const [columns, setColumns] = useState<DatatableColumn[]>([]);
  const [errors, setErrors] = useState<Error[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestRef = useRef<AbortController>();
  const loadedResultRef = useRef<{ query: string; fetchColumns: Props['fetchColumns'] }>();
  const currentPropsRef = useRef({ annotation, onChange });
  currentPropsRef.current = { annotation, onChange };

  const savedQuery = annotation.query.esql;
  useEffect(() => setQuery({ esql: savedQuery }), [savedQuery]);

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
      .then((resultColumns) => {
        if (controller.signal.aborted) return;
        setColumns(resultColumns);
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
      columns={columns}
      onChange={onChange}
      queryEditor={
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
              const resultColumns = await fetchColumns(submittedQuery, controller.signal);
              if (controller.signal.aborted) return;
              loadedResultRef.current = { query: submittedQuery.esql, fetchColumns };
              setColumns(resultColumns);
              const current = currentPropsRef.current;
              current.onChange({ ...current.annotation, query: submittedQuery });
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
      }
    />
  );
};
