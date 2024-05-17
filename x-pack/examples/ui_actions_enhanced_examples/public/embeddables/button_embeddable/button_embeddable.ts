/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AdvancedUiActionsStart } from '@kbn/ui-actions-enhanced-plugin/public';
import { Embeddable, EmbeddableInput, VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ButtonEmbeddableComponent } from './button_embeddable_component';

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

  private root?;

  public render(el: HTMLElement): void {
    super.render(el);
    this.root = createRoot(this.el);
    this.root.render(
      createElement(ButtonEmbeddableComponent, {
        onClick: () => {
          this.params.uiActions.getTrigger(VALUE_CLICK_TRIGGER).exec({
            embeddable: this,
            data: {
              data: [],
            },
          });
        },
      })
    );
  }

  public destroy() {
    super.destroy();
    if (this.root) this.root.unmount();
  }
}
