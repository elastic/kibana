/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as React from 'react';

interface LogTextWrapControlsProps {
  wrap: boolean;
  setTextWrap: (scale: boolean) => any;
}

export class LogTextWrapControls extends React.PureComponent<LogTextWrapControlsProps> {
  public toggleWrap = () => {
    this.props.setTextWrap(!this.props.wrap);
  };

  public render() {
    const { wrap } = this.props;

    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.infra.logs.customizeLogs.lineWrappingFormRowLabel"
            defaultMessage="Line Wrapping"
          />
        }
      >
        <EuiSwitch
          label={
            <FormattedMessage
              id="xpack.infra.logs.customizeLogs.wrapLongLinesSwitchLabel"
              defaultMessage="Wrap long lines"
            />
          }
          checked={wrap}
          onChange={this.toggleWrap}
        />
      </EuiFormRow>
    );
  }
}
