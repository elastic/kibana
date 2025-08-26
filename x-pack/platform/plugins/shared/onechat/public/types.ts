/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-empty-interface*/

import type { DataTypeComponent } from './application/components/data_catalog/data_catalog';

export interface ConfigSchema {}

export interface OnechatSetupDependencies {}

export interface OnechatStartDependencies {}

export interface OnechatPluginSetup {
  /**
   * Registry for data type component descriptors
   */
  dataTypeRegistry: {
    /**
     * Register a custom data type component descriptor
     */
    register: (descriptor: DataTypeComponent) => void;
    list: () => Array<string>;
    clear: () => void;
  };
}

export interface OnechatPluginStart {}
