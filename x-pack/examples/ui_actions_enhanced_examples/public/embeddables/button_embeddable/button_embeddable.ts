/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Embeddable } from '../../../../../../src/plugins/embeddable/public';
import { ButtonEmbeddableComponent } from './button_embeddable_component';

export const BUTTON_EMBEDDABLE = 'BUTTON_EMBEDDABLE';

export class ButtonEmbeddable extends Embeddable {
  type = BUTTON_EMBEDDABLE;

  reload() {}

  private el?: HTMLElement;

  public render(el: HTMLElement): void {
    super.render(el);
    this.el = el;
    render(createElement(ButtonEmbeddableComponent, {}), el);
  }

  public destroy() {
    super.destroy();
    if (this.el) unmountComponentAtNode(this.el);
  }
}
