/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { TimeRange } from 'ui/timefilter/time_history';
import { Query, StaticIndexPattern } from 'src/legacy/core_plugins/data/public';
import { Filter } from '@kbn/es-query';
import {
  Embeddable,
  EmbeddableOutput,
  IContainer,
  EmbeddableInput,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/index';
import { Document, DOC_TYPE } from '../../persistence';
import { data } from '../../../../../../../src/legacy/core_plugins/data/public/setup';
import { ExpressionWrapper } from './expression_wrapper';
import { Subscription } from 'rxjs';

const ExpressionRendererComponent = data.expressions.ExpressionRenderer;

export interface LensEmbeddableConfiguration {
  savedVis: Document;
  editUrl: string;
  editable: boolean;
  indexPatterns?: StaticIndexPattern[];
}

export interface LensEmbeddableInput extends EmbeddableInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filter[];
}

export interface LensEmbeddableOutput extends EmbeddableOutput {
  indexPatterns?: StaticIndexPattern[];
}

export class LensEmbeddable extends Embeddable<LensEmbeddableInput, LensEmbeddableOutput> {
  type = DOC_TYPE;

  private savedVis: Document;
  private domNode: HTMLElement | Element | undefined;
  private subscription: Subscription;

  private prevTimeRange?: TimeRange;
  private prevQuery?: Query;
  private prevFilters?: Filter[];

  constructor(
    { savedVis, editUrl, editable, indexPatterns }: LensEmbeddableConfiguration,
    initialInput: LensEmbeddableInput,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        defaultTitle: savedVis.title,
        savedObjectId: savedVis.id!,
        editable,
        editUrl,
        indexPatterns
      },
      parent
    );

    this.savedVis = savedVis;
    this.subscription = this.getInput$().subscribe((input) => this.onContainerStateChanged(input));
    this.onContainerStateChanged(initialInput);
  }

  onContainerStateChanged(containerState: LensEmbeddableInput) {
    const cleanedFilters = containerState.filters ? containerState.filters.filter(filter => !filter.meta.disabled) : undefined;
    if (!_.isEqual(containerState.timeRange, this.prevTimeRange) ||
        !_.isEqual(containerState.query, this.prevQuery) ||
        !_.isEqual(cleanedFilters, this.prevFilters)) {
        this.prevTimeRange = containerState.timeRange;
        this.prevQuery = containerState.query;
        this.prevFilters = cleanedFilters;
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
        ExpressionRenderer={ExpressionRendererComponent}
        expression={this.savedVis.expression}
        context={{
          timeRange: this.prevTimeRange,
          filters: this.prevFilters,
          query: this.prevQuery,
        }}
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
    if (this.domNode) {
      this.render(this.domNode);
    }
  }
}
