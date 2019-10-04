/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { SourceDestinationArrows } from '../../source_destination/source_destination_arrows';
import { SUM_OF_DESTINATION_BYTES, SUM_OF_SOURCE_BYTES } from '../map_config';
import { FeatureProperty, MapFeature } from '../types';

const FlowBadge = styled(EuiBadge)`
  height: 45px;
  min-width: 85px;
`;

interface LineToolTipContentProps {
  contextId: string;
  features: MapFeature[];
  featureProps: FeatureProperty[];
  featureIndex: number;
}

export const LineToolTipContent = React.memo<LineToolTipContentProps>(
  ({ contextId, features, featureProps, featureIndex }) => {
    const lineProps = featureProps.reduce<Record<string, string>>(
      (acc, f) => ({ ...acc, ...{ [f._propertyKey]: f._rawValue } }),
      {}
    );

    return (
      <EuiFlexGroup justifyContent="center" gutterSize="none">
        <EuiFlexItem>
          <FlowBadge color="hollow">
            <EuiFlexGroup direction="column" justifyContent="spaceAround">
              <EuiFlexItem grow={false}>{'Source'}</EuiFlexItem>
            </EuiFlexGroup>
          </FlowBadge>
        </EuiFlexItem>
        <SourceDestinationArrows
          contextId={contextId}
          destinationBytes={[lineProps[SUM_OF_DESTINATION_BYTES]]}
          eventId={`map-line-tooltip-${contextId}`}
          sourceBytes={[lineProps[SUM_OF_SOURCE_BYTES]]}
        />
        <EuiFlexItem>
          <FlowBadge color="hollow">
            <EuiFlexGroup direction="column" justifyContent="spaceAround">
              <EuiFlexItem grow={false}>{'Destination'}</EuiFlexItem>
            </EuiFlexGroup>
          </FlowBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

LineToolTipContent.displayName = 'LineToolTipContent';
