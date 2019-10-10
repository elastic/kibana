/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { loadingCount } from 'ui/chrome';

export default class TopLoadingBar {
  private static loading: boolean = false;

  public static show = () => {
    if (!TopLoadingBar.loading) {
      loadingCount.increment();
      TopLoadingBar.loading = true;
    }
  }

  public static hide = () => {
    if (TopLoadingBar.loading) {
      loadingCount.decrement();
      TopLoadingBar.loading = false;
    }
  }

}
