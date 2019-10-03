/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiOutsideClickDetector,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import { FeatureGeometry, FeatureProperty, MapFeature, MapToolTipProps } from '../types';
import { getOrEmptyTagFromValue } from '../../empty_value';
import { DefaultDraggable } from '../../draggables';
import { SourceDestinationArrows } from '../../source_destination/source_destination_arrows';
import { DraggablePortalContext } from '../../drag_and_drop/draggable_wrapper';
import { MapToolTipFooter } from './tooltip_footer';

const SUM_OF_SOURCE_BYTES = 'sum_of_source.bytes';
const SUM_OF_DESTINATION_BYTES = 'sum_of_destination.bytes';

const FlowBadge = styled(EuiBadge)`
  height: 45px;
  min-width: 85px;
`;

export const MapToolTip = React.memo<MapToolTipProps>(
  ({
    addFilters,
    closeTooltip,
    features = [],
    isLocked,
    getLayerName,
    loadFeatureProperties,
    loadFeatureGeometry,
  }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [featureProps, setFeatureProps] = useState<FeatureProperty[]>([]);
    const [featureGeometry, setFeatureGeometry] = useState<FeatureGeometry | null>(null);
    const [, setLayerName] = useState<string>('');
    const [currentFeature, setCurrentFeature] = useState<number>(1);
    const featuresRef = useRef<MapFeature[] | null>(null);

    const featureIndex = currentFeature - 1;

    // console.group('MapToolTip Render');
    // console.log('isLocked', isLocked);
    // console.log('isLoading', isLoading);

    useEffect(() => {
      // Keep a ref of features to determine the render of one feature from the next to ensure the loader is displayed
      featuresRef.current = features;

      if (
        features.length === 0 ||
        getLayerName == null ||
        loadFeatureProperties == null ||
        loadFeatureGeometry == null
      ) {
        return;
      }

      setIsLoading(true);

      const fetchFeatureProps = async () => {
        if (features[featureIndex] != null) {
          const [featureProperties, featureGeo, layerNameString] = await Promise.all([
            loadFeatureProperties({
              layerId: features[featureIndex].layerId,
              featureId: features[featureIndex].id,
            }),
            loadFeatureGeometry({
              layerId: features[featureIndex].layerId,
              featureId: features[featureIndex].id,
            }),
            getLayerName(features[featureIndex].layerId),
          ]);
          // console.group('MapToolTip initial useEffect()');
          // console.log('featureProps', featureProperties);
          // console.log('featureGeometry', featureGeo);
          // console.log('layerName', layerName);
          // console.groupEnd();
          setFeatureProps(featureProperties);
          setFeatureGeometry(featureGeo);
          setLayerName(layerNameString);
          setIsLoading(false);
        }
      };

      fetchFeatureProps();
    }, [
      currentFeature,
      features
        .map(f => `${f.id}-${f.layerId}`)
        .sort()
        .join(),
    ]);

    const featureDescriptionListItems = featureProps.map(property => ({
      title: property._propertyKey,
      description: (
        <span>
          <DefaultDraggable
            data-test-subj="port"
            field={property._propertyKey}
            id={`port-default-draggable-map-${property._propertyKey}-${property._rawValue}`}
            tooltipContent={property._propertyKey}
            value={property._rawValue}
          >
            {getOrEmptyTagFromValue(property._rawValue)}
          </DefaultDraggable>
          <EuiToolTip content={'Filter for value'}>
            <EuiIcon
              type="filter"
              onClick={async () => {
                if (closeTooltip != null && addFilters != null) {
                  closeTooltip();
                  const filters = await property.getESFilters();
                  addFilters(filters);
                }
              }}
            />
          </EuiToolTip>
        </span>
      ),
    }));

    // Extract props of line feature // TODO Put in renderLineStringTooltip
    const lineProps = featureProps.reduce<Record<string, string>>(
      (acc, f) => ({ ...acc, ...{ [f._propertyKey]: f._rawValue } }),
      {}
    );

    const areSameFeatures = (oldFeatures: MapFeature[], newFeatures: MapFeature[]) => {
      return (
        oldFeatures
          .map(f => `${f.id}-${f.layerId}`)
          .sort()
          .join() ===
        newFeatures
          .map(f => `${f.id}-${f.layerId}`)
          .sort()
          .join()
      );
    };

    // console.log('featureDescriptionListItems', featureDescriptionListItems);
    // console.log('lineProps', lineProps);
    // console.log('features', features);
    // console.log('featuresRef', featuresRef.current);
    // console.groupEnd();

    const renderLineStringTooltip = (): React.ReactElement => {
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
            contextId={`${features[featureIndex].layerId}-${features[featureIndex].id}`}
            destinationBytes={[lineProps[SUM_OF_DESTINATION_BYTES]]}
            eventId={`source-destination-line-${features[featureIndex].layerId}`}
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
    };

    return isLoading ||
      (!isLocked &&
        featuresRef.current != null &&
        !areSameFeatures(featuresRef.current, features)) ? (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <DraggablePortalContext.Provider value={true}>
        <EuiOutsideClickDetector
          onOutsideClick={() => {
            if (closeTooltip != null) {
              closeTooltip();
            }
          }}
        >
          <div>
            {featureGeometry != null && featureGeometry.type === 'LineString' ? (
              renderLineStringTooltip()
            ) : (
              <EuiDescriptionList textStyle="reverse" listItems={featureDescriptionListItems} />
            )}
            <MapToolTipFooter
              currentFeature={currentFeature}
              totalFeatures={features.length}
              previousFeature={() => setCurrentFeature(currentFeature - 1)}
              nextFeature={() => setCurrentFeature(currentFeature + 1)}
            />
          </div>
        </EuiOutsideClickDetector>
      </DraggablePortalContext.Provider>
    );
  }
);

MapToolTip.displayName = 'MapToolTip';
