/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { InfraMetricData, InfraTimerangeInput } from '../../graphql/types';
import { InfraMetricLayoutSection } from '../../pages/metrics/layouts/types';
import { sections } from './sections';

interface Props {
  section: InfraMetricLayoutSection;
  metrics: InfraMetricData[];
  onChangeRangeTime?: (time: InfraTimerangeInput) => void;
  crosshairValue?: number;
  onCrosshairUpdate?: (crosshairValue: number) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
}

export class Section extends React.PureComponent<Props> {
  public render() {
    const metric = this.props.metrics.find(m => m.id === this.props.section.id);
    if (!metric) {
      return null;
    }
    let sectionProps = {};
    if (this.props.section.type === 'chart') {
      sectionProps = {
        onChangeRangeTime: this.props.onChangeRangeTime,
        crosshairValue: this.props.crosshairValue,
        onCrosshairUpdate: this.props.onCrosshairUpdate,
        isLiveStreaming: this.props.isLiveStreaming,
        stopLiveStreaming: this.props.stopLiveStreaming,
      };
    }
    const Component = sections[this.props.section.type];
    return <Component section={this.props.section} metric={metric} {...sectionProps} />;
  }
}
