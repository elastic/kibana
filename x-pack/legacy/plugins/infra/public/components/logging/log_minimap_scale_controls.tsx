/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as React from 'react';

interface IntervalSizeDescriptor {
  label: string;
  intervalSize: number;
}

interface LogMinimapScaleControlsProps {
  availableIntervalSizes: IntervalSizeDescriptor[];
  intervalSize: number;
  setIntervalSize: (intervalSize: number) => any;
}

export class LogMinimapScaleControls extends React.PureComponent<LogMinimapScaleControlsProps> {
  public handleScaleChange = (intervalSizeDescriptorKey: string) => {
    const { availableIntervalSizes, setIntervalSize } = this.props;
    const [sizeDescriptor] = availableIntervalSizes.filter(
      intervalKeyEquals(intervalSizeDescriptorKey)
    );

    if (sizeDescriptor) {
      setIntervalSize(sizeDescriptor.intervalSize);
    }
  };

  public render() {
    const { availableIntervalSizes, intervalSize } = this.props;
    const [currentSizeDescriptor] = availableIntervalSizes.filter(intervalSizeEquals(intervalSize));

    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.infra.logs.customizeLogs.minimapScaleFormRowLabel"
            defaultMessage="Minimap Scale"
          />
        }
      >
        <EuiRadioGroup
          options={availableIntervalSizes.map(sizeDescriptor => ({
            id: getIntervalSizeDescriptorKey(sizeDescriptor),
            label: sizeDescriptor.label,
          }))}
          onChange={this.handleScaleChange}
          idSelected={getIntervalSizeDescriptorKey(currentSizeDescriptor)}
        />
      </EuiFormRow>
    );
  }
}

const getIntervalSizeDescriptorKey = (sizeDescriptor: IntervalSizeDescriptor) =>
  `${sizeDescriptor.intervalSize}`;

const intervalKeyEquals = (key: string) => (sizeDescriptor: IntervalSizeDescriptor) =>
  getIntervalSizeDescriptorKey(sizeDescriptor) === key;

const intervalSizeEquals = (size: number) => (sizeDescriptor: IntervalSizeDescriptor) =>
  sizeDescriptor.intervalSize === size;
