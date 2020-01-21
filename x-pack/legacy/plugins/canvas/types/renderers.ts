/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type GenericCallback = (callback: () => void) => void;

export interface RendererHandlers {
  /** Handler to invoke when an element has finished rendering */
  done: () => void;
  /** Handler to invoke when an element is deleted or changes to a different render type */
  onDestroy: GenericCallback;
  /** Handler to invoke when an element's dimensions have changed*/
  onResize: GenericCallback;
  /** Retrieves the value of the filter property on the element object persisted on the workpad */
  getFilter: () => string;
  /** Sets the value of the filter property on the element object persisted on the workpad */
  setFilter: (filter: string) => void;
  /** Handler to invoke when the input to a function has changed internally */
  onEmbeddableInputChange: (expression: string) => void;
  /** Handler to invoke when a rendered embeddable is destroyed */
  onEmbeddableDestroyed: () => void;
}

export interface RendererSpec<RendererConfig = {}> {
  /** The render type */
  name: string;
  /** The name to display */
  displayName: string;
  /** A description of what is rendered */
  help: string;
  /** Indicate whether the element should reuse the existing DOM element when re-rendering */
  reuseDomNode: boolean;
  /** The default width of the element in pixels */
  width?: number;
  /** The default height of the element in pixels */
  height?: number;
  /** A function that renders an element into the specified DOM element */
  render: (domNode: HTMLElement, config: RendererConfig, handlers: RendererHandlers) => void;
}

export type RendererFactory<RendererConfig = {}> = () => RendererSpec<RendererConfig>;
