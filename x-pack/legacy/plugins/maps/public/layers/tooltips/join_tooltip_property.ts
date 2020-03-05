/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITooltipProperty } from './tooltip_property';
import { IJoin } from '../joins/join';

export class JoinTooltipProperty implements ITooltipProperty {

  private _tooltipProperty: ITooltipProperty;
  private _leftInnerJoins: IJoin[];

  constructor(tooltipProperty: ITooltipProperty, leftInnerJoins: IJoin[]) {
    this._tooltipProperty = tooltipProperty;
    this._leftInnerJoins = leftInnerJoins;
  }

  isFilterable(): boolean {
    return true;
  }

  getPropertyKey(): string {
    return this._tooltipProperty.getPropertyKey();
  }

  getPropertyName(): string {
    return this._tooltipProperty.getPropertyName();
  }

  getRawValue(): string {
    return this._tooltipProperty.getRawValue();
  }

  getHtmlDisplayValue(): string {
    return this._tooltipProperty.getHtmlDisplayValue();
  }

  async getESFilters(): Promise<Filter[]> {
    const esFilters = [];
    if (this._tooltipProperty.isFilterable()) {
      esFilters.push(...(await this._tooltipProperty.getESFilters()));
    }

    for (let i = 0; i < this._leftInnerJoins.length; i++) {
      const rightSource = this._leftInnerJoins[i].getRightJoinSource();
      const termField = rightSource.getTermField();
      try {
        const esTooltipProperty = await termField.createTooltipProperty(
          this._tooltipProperty.getRawValue()
        );
        if (esTooltipProperty) {
          esFilters.push(...(await esTooltipProperty.getESFilters()));
        }
      } catch (e) {
        console.error('Cannot create joined filter', e);
      }
    }

    return esFilters;
  }
}
