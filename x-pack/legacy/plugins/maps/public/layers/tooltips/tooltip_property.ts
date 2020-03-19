/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { PhraseFilter } from '../../../../../../../src/plugins/data/public';

export interface ITooltipProperty {
  getPropertyKey(): string;
  getPropertyName(): string;
  getHtmlDisplayValue(): string;
  getRawValue(): string | undefined;
  isFilterable(): boolean;
  getESFilters(): Promise<PhraseFilter[]>;
}

export class TooltipProperty implements ITooltipProperty {
  private readonly _propertyKey: string;
  private readonly _propertyName: string;
  private readonly _rawValue: string | undefined;

  constructor(propertyKey: string, propertyName: string, rawValue: string | undefined) {
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

  getRawValue(): string | undefined {
    return this._rawValue;
  }

  isFilterable(): boolean {
    return false;
  }

  async getESFilters(): Promise<PhraseFilter[]> {
    return [];
  }
}
