/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { filterBarQueryFilter } from '../../../kibana_services';
import { TooltipProperty } from './tooltip_property';

export class JoinTooltipProperty extends TooltipProperty {

  constructor(tooltipProperty, leftInnerJoins) {
    super();
    this._tooltipProperty = tooltipProperty;
    this._leftInnerJoins = leftInnerJoins;
  }

  isFilterable() {
    return true;
  }

  getPropertyName() {
    return this._tooltipProperty.getPropertyName();
  }

  getHtmlDisplayValue() {
    return this._tooltipProperty.getHtmlDisplayValue();
  }

  getFilterAction() {
    //dispatch all the filter actions to the query bar
    //this relies on the de-duping of filterBarQueryFilter
    return async () => {
      const esFilters = [];
      if (this._tooltipProperty.isFilterable()) {
        esFilters.push(this._tooltipProperty.getESFilter());
      }

      for (let i = 0; i < this._leftInnerJoins.length; i++) {
        const rightSource =  this._leftInnerJoins[i].getRightJoinSource();
        const esTooltipProperty = await rightSource.createESTooltipProperty(
          rightSource.getTerm(),
          this._tooltipProperty.getRawValue()
        );
        if (esTooltipProperty) {
          const filter = esTooltipProperty.getESFilter();
          esFilters.push(filter);
        }
      }
      filterBarQueryFilter.addFilters(esFilters);
    };
  }


}
