/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React, { FC, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { omit } from 'lodash';
import {
  AggregateQuery,
  COMPARE_ALL_OPTIONS,
  Filter,
  Query,
  TimeRange,
  onlyDisabledFiltersChanged,
} from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import { CANVAS_EMBEDDABLE_CLASSNAME } from '../../../common/lib';
import { RendererStrings } from '../../../i18n';
import {
  CanvasContainerApi,
  EmbeddableInput,
  RendererFactory,
  RendererHandlers,
} from '../../../types';
import { EmbeddableExpression } from '../../expression_types/embeddable';
import { StartDeps } from '../../plugin';
import { embeddableInputToExpression } from './embeddable_input_to_expression';

const { embeddable: strings } = RendererStrings;

const children: Record<string, { setFilters: (filters: Filter[] | undefined) => void }> = {};

const renderReactEmbeddable = ({
  type,
  uuid,
  input,
  container,
  handlers,
  core,
}: {
  type: string;
  uuid: string;
  input: EmbeddableInput;
  container: CanvasContainerApi;
  handlers: RendererHandlers;
  core: CoreStart;
}) => {
  // wrap in functional component to allow usage of hooks
  const RendererWrapper: FC<{}> = () => {
    const searchApi = useMemo(() => {
      return {
        filters$: new BehaviorSubject<Filter[] | undefined>(input.filters),
        query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
        timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      };
    }, []);

    return (
      <ReactEmbeddableRenderer
        type={type}
        maybeId={uuid}
        getParentApi={(): CanvasContainerApi => ({
          ...container,
          getSerializedStateForChild: () => ({
            rawState: omit(input, ['disableTriggers', 'filters']),
          }),
          ...searchApi,
        })}
        key={`${type}_${uuid}`}
        onAnyStateChange={(newState) => {
          const newExpression = embeddableInputToExpression(
            newState.rawState as unknown as EmbeddableInput,
            type,
            undefined,
            true
          );
          if (newExpression) handlers.onEmbeddableInputChange(newExpression);
        }}
        onApiAvailable={(api) => {
          children[uuid] = {
            ...api,
            setFilters: (filters: Filter[] | undefined) => {
              if (
                !onlyDisabledFiltersChanged(searchApi.filters$.getValue(), filters, {
                  ...COMPARE_ALL_OPTIONS,
                  // do not compare $state to avoid refreshing when filter is pinned/unpinned (which does not impact results)
                  state: false,
                })
              ) {
                searchApi.filters$.next(filters);
              }
            },
          };
        }}
      />
    );
  };

  return (
    <KibanaRenderContextProvider {...core}>
      <div
        className={CANVAS_EMBEDDABLE_CLASSNAME}
        style={{ width: '100%', height: '100%', cursor: 'auto' }}
      >
        <RendererWrapper />
      </div>
    </KibanaRenderContextProvider>
  );
};

export const embeddableRendererFactory = (
  core: CoreStart,
  plugins: StartDeps
): RendererFactory<EmbeddableExpression<EmbeddableInput> & { canvasApi: CanvasContainerApi }> => {
  return () => ({
    name: 'embeddable',
    displayName: strings.getDisplayName(),
    help: strings.getHelpDescription(),
    reuseDomNode: true,
    render: async (domNode, { input, embeddableType, canvasApi }, handlers) => {
      const uuid = handlers.getElementId();
      const api = children[uuid];
      if (!api) {
        ReactDOM.render(
          renderReactEmbeddable({
            input,
            handlers,
            uuid,
            type: embeddableType,
            container: canvasApi,
            core,
          }),
          domNode,
          () => handlers.done()
        );

        handlers.onDestroy(() => {
          delete children[uuid];
          handlers.onEmbeddableDestroyed();
          return ReactDOM.unmountComponentAtNode(domNode);
        });
      } else {
        api.setFilters(input.filters);
      }
    },
  });
};
