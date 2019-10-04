/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { FeatureGeometry, FeatureProperty, MapFeature, MapToolTipProps } from '../types';
import { DraggablePortalContext } from '../../drag_and_drop/draggable_wrapper';
import { MapToolTipFooter } from './tooltip_footer';
import { LineToolTipContent } from './line_tool_tip_content';
import { PointToolTipContent } from './point_tool_tip_content';

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
    const [featureIndex, setFeatureIndex] = useState<number>(0);
    const [featureProps, setFeatureProps] = useState<FeatureProperty[]>([]);
    const [featurePropsFilters, setFeaturePropsFilters] = useState<Record<string, object>>({});
    const [featureGeometry, setFeatureGeometry] = useState<FeatureGeometry | null>(null);
    const [, setLayerName] = useState<string>('');

    // Keep a ref of features to determine the render of one feature from the next to ensure the loader is displayed
    const featuresRef = useRef<MapFeature[] | null>(null);

    useEffect(() => {
      featuresRef.current = features;

      // Early return if component doesn't yet have props -- result of mounting in portal before actual rendering
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

          // Fetch ES filters in advance while loader is present to prevent lag when user clicks to add filter
          const featurePropsPromises = await Promise.all(
            featureProperties.map(property => property.getESFilters())
          );
          const featurePropsESFilters = featureProperties.reduce(
            (acc, property, index) => ({
              ...acc,
              [property._propertyKey]: featurePropsPromises[index],
            }),
            {}
          );

          setFeatureProps(featureProperties);
          setFeaturePropsFilters(featurePropsESFilters);
          setFeatureGeometry(featureGeo);
          setLayerName(layerNameString);
          setIsLoading(false);
        }
      };

      fetchFeatureProps();
    }, [
      featureIndex,
      features
        .map(f => `${f.id}-${f.layerId}`)
        .sort()
        .join(),
    ]);

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
              <LineToolTipContent
                contextId={`${features[featureIndex].layerId}-${features[featureIndex].id}`}
                features={features}
                featureProps={featureProps}
                featureIndex={featureIndex}
              />
            ) : (
              <PointToolTipContent
                contextId={`${features[featureIndex].layerId}-${features[featureIndex].id}`}
                featureProps={featureProps}
                featurePropsFilters={featurePropsFilters}
                addFilters={addFilters}
                closeTooltip={closeTooltip}
              />
            )}
            {features.length > 1 && (
              <MapToolTipFooter
                featureIndex={featureIndex}
                totalFeatures={features.length}
                previousFeature={() => setFeatureIndex(featureIndex - 1)}
                nextFeature={() => setFeatureIndex(featureIndex + 1)}
              />
            )}
          </div>
        </EuiOutsideClickDetector>
      </DraggablePortalContext.Provider>
    );
  }
);

MapToolTip.displayName = 'MapToolTip';
