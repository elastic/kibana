/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React, { FC, useEffect, useMemo, useRef } from 'react';
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
import { BehaviorSubject, Subscription } from 'rxjs';
import { apiHasSerializableState, apiPublishesUnsavedChanges } from '@kbn/presentation-publishing';
import { CANVAS_EMBEDDABLE_CLASSNAME } from '../../../common/lib';
import { RendererStrings } from '../../../i18n';
import { CanvasContainerApi, RendererFactory, RendererHandlers } from '../../../types';
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
  input: { filters?: Filter[] };
  container: CanvasContainerApi;
  handlers: RendererHandlers;
  core: CoreStart;
}) => {
  // wrap in functional component to allow usage of hooks
  const RendererWrapper: FC<{}> = () => {
    const subscriptionRef = useRef<Subscription | undefined>(undefined);

    // Clean up subscriptionRef onUnmount
    useEffect(() => {
      return () => {
        subscriptionRef.current?.unsubscribe();
      };
    }, []);

    // set intial panel state onMount
    useMemo(() => {
      container.setSerializedStateForChild(uuid, {
        rawState: omit(input, ['disableTriggers', 'filters']),
      });
    }, []);

    const searchApi = useMemo(() => {
      return {
        filters$: new BehaviorSubject<Filter[] | undefined>(input.filters),
        query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
        timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      };
    }, []);

    return (
      <EmbeddableRenderer
        type={type}
        maybeId={uuid}
        getParentApi={(): CanvasContainerApi => ({
          ...container,
          ...searchApi,
        })}
        key={`${type}_${uuid}`}
        onApiAvailable={(api) => {
          if (apiPublishesUnsavedChanges(api) && apiHasSerializableState(api)) {
            subscriptionRef.current = api.hasUnsavedChanges$.subscribe((hasUnsavedChanges) => {
              if (!hasUnsavedChanges) return;
              const newState = api.serializeState();
              // canvas auto-saves so update child state on any change
              container.setSerializedStateForChild(uuid, newState);
              const newExpression = embeddableInputToExpression(
                newState.rawState,
                type,
                undefined,
                true
              );
              if (newExpression) handlers.onEmbeddableInputChange(newExpression);
            });
          }
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
): RendererFactory<EmbeddableExpression & { canvasApi: CanvasContainerApi }> => {
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
        api.setFilters((input as { filters?: Filter[] }).filters);
      }
    },
  });
};
