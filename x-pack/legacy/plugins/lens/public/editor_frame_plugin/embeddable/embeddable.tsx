/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Query, TimeRange, esFilters } from 'src/plugins/data/public';
import { ExpressionRenderer } from 'src/plugins/expressions/public';
import { IIndexPattern } from 'src/plugins/data/public';
import { Subscription } from 'rxjs';
import {
  Embeddable as AbstractEmbeddable,
  EmbeddableOutput,
  IContainer,
  EmbeddableInput,
  EmbeddableHandlers,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { Document, DOC_TYPE } from '../../persistence';
import { ExpressionWrapper } from './expression_wrapper';

export interface LensEmbeddableConfiguration {
  savedVis: Document;
  editUrl: string;
  editable: boolean;
  indexPatterns?: IIndexPattern[];
}

export interface LensEmbeddableInput extends EmbeddableInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: esFilters.Filter[];
}

export interface LensEmbeddableOutput extends EmbeddableOutput {
  indexPatterns?: IIndexPattern[];
}

export class Embeddable extends AbstractEmbeddable<LensEmbeddableInput, LensEmbeddableOutput> {
  type = DOC_TYPE;

  private expressionRenderer: ExpressionRenderer;
  private savedVis: Document;
  private domNode: HTMLElement | Element | undefined;
  private subscription: Subscription;

  private currentContext: {
    timeRange?: TimeRange;
    query?: Query;
    filters?: esFilters.Filter[];
    lastReloadRequestTime?: number;
  } = {};

  constructor(
    expressionRenderer: ExpressionRenderer,
    { savedVis, editUrl, editable, indexPatterns }: LensEmbeddableConfiguration,
    initialInput: LensEmbeddableInput,
    handlers: EmbeddableHandlers
  ) {
    super(
      initialInput,
      {
        defaultTitle: savedVis.title,
        savedObjectId: savedVis.id,
        editable,
        // passing edit url and index patterns to the output of this embeddable for
        // the container to pick them up and use them to configure filter bar and
        // config dropdown correctly.
        editUrl,
        indexPatterns,
      },
      handlers
    );

    this.expressionRenderer = expressionRenderer.bind({
      extraHandlers: { search: this.searchCollector.search },
    });
    this.savedVis = savedVis;
    this.subscription = this.getInput$().subscribe(input => this.onContainerStateChanged(input));
    this.onContainerStateChanged(initialInput);
  }

  onContainerStateChanged(containerState: LensEmbeddableInput) {
    const cleanedFilters = containerState.filters
      ? containerState.filters.filter(filter => !filter.meta.disabled)
      : undefined;
    if (
      !_.isEqual(containerState.timeRange, this.currentContext.timeRange) ||
      !_.isEqual(containerState.query, this.currentContext.query) ||
      !_.isEqual(cleanedFilters, this.currentContext.filters)
    ) {
      this.currentContext = {
        timeRange: containerState.timeRange,
        query: containerState.query,
        lastReloadRequestTime: this.currentContext.lastReloadRequestTime,
        filters: cleanedFilters,
      };

      if (this.domNode) {
        this.render(this.domNode);
      }
    }
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode: HTMLElement | Element) {
    this.domNode = domNode;
    render(
      <ExpressionWrapper
        ExpressionRenderer={this.expressionRenderer}
        expression={this.savedVis.expression}
        context={this.currentContext}
      />,
      domNode
    );
  }

  destroy() {
    super.destroy();
    if (this.domNode) {
      unmountComponentAtNode(this.domNode);
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  reload() {
    const currentTime = Date.now();
    if (this.currentContext.lastReloadRequestTime !== currentTime) {
      this.currentContext = {
        ...this.currentContext,
        lastReloadRequestTime: currentTime,
      };

      if (this.domNode) {
        this.render(this.domNode);
      }
    }
  }
}
