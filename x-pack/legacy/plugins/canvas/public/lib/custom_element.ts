/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface CustomElement {
  /**
   * unique ID for the custom element
   */
  id: string;
  /**
   * name of the custom element
   */
  name: string;
  /**
   * name to be displayed from element picker
   */
  displayName: string;
  /**
   * description of the custom element
   */
  help?: string;
  /**
   * base 64 data URL string of the preview image
   */
  image?: string;
  /**
   * tags associated with the element
   */
  tags?: string[];
  /**
   * the element object stringified
   */
  content: string;
}
