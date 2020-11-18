/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { AdvancedUiActionsStart } from '../../../../../plugins/ui_actions_enhanced/public';
import { Embeddable, EmbeddableInput } from '../../../../../../src/plugins/embeddable/public';
import { ButtonEmbeddableComponent } from './button_embeddable_component';
import { VALUE_CLICK_TRIGGER } from '../../../../../../src/plugins/ui_actions/public';

export const BUTTON_EMBEDDABLE = 'BUTTON_EMBEDDABLE';

export interface ButtonEmbeddableParams {
  uiActions: AdvancedUiActionsStart;
}

export class ButtonEmbeddable extends Embeddable {
  type = BUTTON_EMBEDDABLE;

  constructor(input: EmbeddableInput, private readonly params: ButtonEmbeddableParams) {
    super(input, {});
  }

  reload() {}

  private el?: HTMLElement;

  public render(el: HTMLElement): void {
    super.render(el);
    this.el = el;
    render(
      createElement(ButtonEmbeddableComponent, {
        onClick: () => {
          this.params.uiActions.getTrigger(VALUE_CLICK_TRIGGER).exec({
            embeddable: this,
            data: {
              data: [],
            },
          });
        },
      }),
      el
    );
  }

  public destroy() {
    super.destroy();
    if (this.el) unmountComponentAtNode(this.el);
  }
}
