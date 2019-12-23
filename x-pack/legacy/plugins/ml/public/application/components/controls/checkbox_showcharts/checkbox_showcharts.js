/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for a checkbox element to toggle charts display.
 */
import React, { Component } from 'react';
import { useObservable } from 'react-use';
import { BehaviorSubject } from 'rxjs';

import { EuiCheckbox } from '@elastic/eui';

import makeId from '@elastic/eui/lib/components/form/form_row/make_id';
import { FormattedMessage } from '@kbn/i18n/react';

export const SHOW_CHARTS_DEFAULT = true;

export const showCharts$ = new BehaviorSubject(SHOW_CHARTS_DEFAULT);

class CheckboxShowChartsUnwrapped extends Component {
  onChange = e => {
    const showCharts = e.target.checked;
    showCharts$.next(showCharts);
  };

  render() {
    return (
      <EuiCheckbox
        id={makeId()}
        label={
          <FormattedMessage
            id="xpack.ml.controls.checkboxShowCharts.showChartsCheckboxLabel"
            defaultMessage="Show charts"
          />
        }
        checked={this.props.showCharts}
        onChange={this.onChange}
      />
    );
  }
}

export const CheckboxShowCharts = () => {
  const showCharts = useObservable(showCharts$);
  return <CheckboxShowChartsUnwrapped showCharts={showCharts} />;
};
