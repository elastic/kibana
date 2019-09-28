/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { FeatureProperty, MapToolTipProps } from './types';
import { getOrEmptyTagFromValue } from '../empty_value';
import { DefaultDraggable } from '../draggables';
export const MapToolTip = React.memo<MapToolTipProps>(
  ({ addFilters, closeTooltip, features = [], isLocked, loadFeatureProperties = () => [] }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [featureProps, setFeatureProps] = useState<FeatureProperty[]>([]);
    //
    // console.group('MapToolTip Render');
    // console.log('addFilters', addFilters);
    // console.log('closeTooltip', closeTooltip);
    // console.log('features', features);
    // console.log('isLocked', isLocked);
    // console.log('loadFeatureProperties', loadFeatureProperties);
    // console.groupEnd();

    useEffect(() => {
      if (features.length === 0) {
        return;
      }

      setIsLoading(true);
      // console.group('MapToolTip initial useEffect()');
      // console.log('addFilters', addFilters);
      // console.groupEnd();

      const fetchFeatureProps = async () => {
        if (features[0] != null) {
          const featureProperties = await loadFeatureProperties({
            layerId: features[0].layerId,
            featureId: features[0].id,
          });
          // console.log('featureProps', featureProps);
          setFeatureProps(featureProperties);
          setIsLoading(false);
        }
      };

      fetchFeatureProps();
    }, [features.sort().join()]);

    const featureDescriptionListItems = featureProps.map(
      ({ _propertyKey: fieldName, _rawValue: fieldValue }) => ({
        title: fieldName,
        description: (
          <DefaultDraggable
            data-test-subj="port"
            field={fieldName}
            id={`port-default-draggable-map-${fieldName}-${fieldValue}`}
            tooltipContent={fieldName}
            usePortal={true}
            value={fieldValue}
          >
            {getOrEmptyTagFromValue(fieldValue)}
          </DefaultDraggable>
        ),
      })
    );

    // console.log('featureDescriptionListItems', featureDescriptionListItems);

    return isLoading || featureDescriptionListItems.length === 0 ? (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <EuiOutsideClickDetector
        onOutsideClick={() => {
          if (closeTooltip != null) {
            closeTooltip();
          }
        }}
      >
        <EuiDescriptionList textStyle="reverse" listItems={featureDescriptionListItems} />
      </EuiOutsideClickDetector>
    );
  }
);

MapToolTip.displayName = 'MapToolTip';
