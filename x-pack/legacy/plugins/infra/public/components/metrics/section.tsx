/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { InfraTimerangeInput, InfraNodeType } from '../../graphql/types';
import { InfraMetricLayoutSection } from '../../pages/metrics/layouts/types';
import { sections } from './sections';
import { InfraMetricCombinedData } from '../../containers/metrics/with_metrics';
import { SourceConfiguration } from '../../utils/source_configuration';

interface Props {
  section: InfraMetricLayoutSection;
  metrics: InfraMetricCombinedData[];
  onChangeRangeTime?: (time: InfraTimerangeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
  nodeId: string;
  nodeType: InfraNodeType;
  sourceConfiguration: SourceConfiguration;
  timeRange: InfraTimerangeInput;
}

export class Section extends React.PureComponent<Props> {
  public render() {
    const metric = this.props.metrics.find(m => m.id === this.props.section.id);
    if (!metric) {
      return null;
    }
    let sectionProps = {};
    if (['apm', 'chart'].includes(this.props.section.type)) {
      sectionProps = {
        onChangeRangeTime: this.props.onChangeRangeTime,
        isLiveStreaming: this.props.isLiveStreaming,
        stopLiveStreaming: this.props.stopLiveStreaming,
      };
    }
    const Component = sections[this.props.section.type];
    return (
      <Component
        nodeId={this.props.nodeId}
        nodeType={this.props.nodeType}
        sourceConfiguration={this.props.sourceConfiguration}
        timeRange={this.props.timeRange}
        section={this.props.section}
        metric={metric}
        {...sectionProps}
      />
    );
  }
}
