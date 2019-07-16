/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { Provider } from 'react-redux';
import { render, unmountComponentAtNode } from 'react-dom';

import { Embeddable, EmbeddableOutput, IContainer, EmbeddableInput } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/index';
import { I18nContext } from 'ui/i18n';
import { Document } from '../../persistence';
import { data } from '../../../../../../../src/legacy/core_plugins/data/public/setup';

const ExpressionRendererComponent = data.expressions.ExpressionRenderer;

export interface LensEmbeddableInput extends EmbeddableInput {
  savedVis: Document;
}


export class LensEmbeddable extends Embeddable<LensEmbeddableInput> {
  type = 'lens';

  private savedVis: Document;
  private domNode: HTMLElement | Element | undefined;

  constructor(input: LensEmbeddableInput, output: EmbeddableOutput, parent?: IContainer) {
    super(
      input,
      output,
      parent);

      this.savedVis = input.savedVis;
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode: HTMLElement | Element) {
    this.domNode = domNode;
    render(
        <ExpressionRendererComponent
          className="lnsExpressionOutput"
          // TODO get the expression out of the saved vis
          expression={''}
          onRenderFailure={(e: unknown) => {
            // TODO error handling
          }}
        />, domNode);
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
