/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiHorizontalRule,
  EuiIcon,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import styled from 'styled-components';
import * as i18n from '../translations';

export const Icon = styled(EuiIcon)`
  margin-right: ${theme.euiSizeS};
`;

Icon.displayName = 'Icon';

interface MapToolTipFooterProps {
  currentFeature: number;
  totalFeatures: number;
  previousFeature: () => void;
  nextFeature: () => void;
}

export const MapToolTipFooter = React.memo<MapToolTipFooterProps>(
  ({ currentFeature, totalFeatures, previousFeature, nextFeature }) => {
    return (
      <>
        <EuiHorizontalRule />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText>{i18n.MAP_TOOL_TIP_FEATURES_FOOTER(currentFeature, totalFeatures)}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span>
              <EuiButtonIcon
                color={'text'}
                onClick={previousFeature}
                iconType="arrowLeft"
                aria-label="Next"
                disabled={currentFeature === 1}
              />
              <EuiButtonIcon
                color={'text'}
                onClick={nextFeature}
                iconType="arrowRight"
                aria-label="Next"
                disabled={currentFeature === totalFeatures}
              />
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

MapToolTipFooter.displayName = 'MapToolTipFooter';
