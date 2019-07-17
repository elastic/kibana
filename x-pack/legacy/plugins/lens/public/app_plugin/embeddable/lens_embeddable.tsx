/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import {
  Embeddable,
  EmbeddableOutput,
  IContainer,
  EmbeddableInput,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/index';
import { Document, DOC_TYPE } from '../../persistence';
import { data } from '../../../../../../../src/legacy/core_plugins/data/public/setup';
import { ExpressionWrapper } from './expression_wrapper';

const ExpressionRendererComponent = data.expressions.ExpressionRenderer;

export interface LensEmbeddableConfiguration {
  savedVis: Document;
  editUrl: string;
  editable: boolean;
}

export interface LensEmbeddableInput extends EmbeddableInput {
  // timeRange?: TimeRange;
  // query?: Query;
  // filters?: Filter[];
}

export interface LensEmbeddableOutput extends EmbeddableOutput {}

export class LensEmbeddable extends Embeddable<LensEmbeddableInput, LensEmbeddableOutput> {
  type = DOC_TYPE;

  private savedVis: Document;
  private domNode: HTMLElement | Element | undefined;

  constructor(
    { savedVis, editUrl, editable }: LensEmbeddableConfiguration,
    initialInput: LensEmbeddableInput,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        defaultTitle: savedVis.title,
        savedObjectId: savedVis.id!,
        editable,
        editUrl
      },
      parent
    );

    this.savedVis = savedVis;
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
      />,
      domNode
    );
  }

  destroy() {
    super.destroy();
    if (this.domNode) {
      unmountComponentAtNode(this.domNode);
    }
  }

  reload() {
    // TODO re-render here once we actually pass context down to the visualization
  }
}
