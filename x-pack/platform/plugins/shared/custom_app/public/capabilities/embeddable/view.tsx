/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { useSearchApi } from '@kbn/presentation-publishing';
import type { CapabilityViewProps } from '@kbn/custom-app-registry';
import { getClickedRow, type ClickedDatum } from './clicked_row';
import {
  DEFAULT_EMBEDDABLE_HEIGHT,
  type EmbeddableNode,
} from '../../../common/capabilities/embeddable/manifest';

/** Keeps a subject with the latest value, made once, as the panels read their context from subjects. */
const useSubject = <T,>(value: T) => {
  const [subject] = useState(() => new BehaviorSubject<T>(value));
  useEffect(() => {
    subject.next(value);
  }, [subject, value]);
  return subject;
};

/**
 * Draws a panel that a dashboard could hold. A panel finds out what it shows from the page it is
 * on, so the app plays that page: it publishes its own time range, filters and query, and the
 * values of the app as variables, and hands over the state of the panel when it is asked for it.
 */
export const EmbeddableView = ({
  node,
  text,
  context,
  esqlVariables,
  runActions,
}: CapabilityViewProps<EmbeddableNode>) => {
  const searchApi = useSearchApi({
    query: context?.query,
    filters: context?.filters,
    timeRange: context?.timeRange,
  });
  const esqlVariables$ = useSubject(esqlVariables);
  const searchSessionId$ = useSubject(context?.searchSessionId);
  const viewMode$ = useMemo(() => new BehaviorSubject('view'), []);
  const reload$ = useMemo(() => new BehaviorSubject<void>(undefined), []);
  // The page asks for what it shows again when its search session changes, as a dashboard does.
  useEffect(() => reload$.next(), [reload$, context?.searchSessionId]);

  const state = JSON.stringify(node.state);
  const hasClick = node.onClick.length > 0;
  // What a click does is read when it happens, so a change of the actions needs no new panel.
  const onClick = useRef(node.onClick);
  onClick.current = node.onClick;
  const run = useRef(runActions);
  run.current = runActions;
  const parentApi = useMemo(
    () => ({
      ...searchApi,
      esqlVariables$,
      searchSessionId$,
      viewMode$,
      reload$,
      getSerializedStateForChild: () => JSON.parse(state) as object,
      // A Lens chart tells the page that hosts it about a click, and leaves what to do to the page.
      // Without actions to run, nothing is taken over and Lens does what it does by default.
      ...(hasClick
        ? {
            onFilter: (event: { data?: readonly ClickedDatum[]; preventDefault: () => void }) => {
              event.preventDefault();
              const row = getClickedRow(event);
              if (row) run.current(onClick.current, { row });
            },
          }
        : {}),
    }),
    [searchApi, esqlVariables$, searchSessionId$, viewMode$, reload$, state, hasClick]
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-node-id={node.id}>
      {node.title ? (
        <EuiTitle size="xxs">
          <h4>{text(node.title)}</h4>
        </EuiTitle>
      ) : null}
      <div
        css={css({ height: node.height ?? DEFAULT_EMBEDDABLE_HEIGHT })}
        data-test-subj="customAppEmbeddable"
      >
        {/* A new state is a new panel, as it is on a dashboard whose panel is changed. */}
        <EmbeddableRenderer
          key={`${node.embeddableType}:${hasClick}:${state}`}
          type={node.embeddableType}
          maybeId={node.id}
          getParentApi={() => parentApi}
          hidePanelChrome
        />
      </div>
    </EuiPanel>
  );
};
