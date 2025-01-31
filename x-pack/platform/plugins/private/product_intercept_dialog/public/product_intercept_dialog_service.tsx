/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ProductInterceptDialogApi } from './product_intercept_dialog_api';

export class ProductInterceptDialogService {
  private api: ProductInterceptDialogApi;
  private targetDomElement?: HTMLElement;

  setup() {
    this.api = new ProductInterceptDialogApi();

    return this.api;
  }

  public start({ targetDomElement, ...startDeps }) {
    this.targetDomElement = targetDomElement;

    render(
      <KibanaRenderContextProvider {...startDeps}>
        <p>Hello!</p>
      </KibanaRenderContextProvider>,
      this.targetDomElement
    );

    return this.api;
  }

  stop() {
    if (this.targetDomElement) {
      unmountComponentAtNode(this.targetDomElement);
    }
  }
}
