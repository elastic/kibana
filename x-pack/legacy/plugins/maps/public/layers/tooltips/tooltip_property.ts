/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export interface ITooltipProperty {
  getPropertyKey(): string;
  getPropertyName(): string;
  getHtmlDisplayValue(): string;
  getRawValue(): string;
  isFilterable(): boolean;
  getESFilters(): Promise<unknown[]>;
}

export class TooltipProperty implements ITooltipProperty {
  private _propertyKey: string;
  private _propertyName: string;
  private _rawValue: string;

  constructor(propertyKey: string, propertyName: string, rawValue: string) {
    this._propertyKey = propertyKey;
    this._propertyName = propertyName;
    this._rawValue = rawValue;
  }

  getPropertyKey(): string {
    return this._propertyKey;
  }

  getPropertyName(): string {
    return this._propertyName;
  }

  getHtmlDisplayValue(): string {
    return _.escape(this._rawValue);
  }

  getRawValue(): string {
    return this._rawValue;
  }

  isFilterable(): boolean {
    return false;
  }

  async getESFilters(): Promise<unknown[]> {
    return [];
  }
}
