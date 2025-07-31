/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState, useCallback } from 'react';
import { UseEuiTheme } from '@elastic/eui';
import type { Map as MapboxMap } from '@kbn/mapbox-gl';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

const MAX_WIDTH = 110;

interface Props {
  isFullScreen: boolean;
  mbMap: MapboxMap;
}

const getScaleDistance = (value: number) => {
  const orderOfMagnitude = Math.floor(Math.log10(value));
  const pow10 = Math.pow(10, orderOfMagnitude);
  // reduce value to single order of magnitude to making rounding simple regardless of order of magnitude
  const distance = value / pow10;

  if (distance < 1) return pow10 * (Math.round(distance * 10) / 10);
  // provide easy to multiple round numbers for scale distance so its easy to measure distances longer then the scale
  if (distance >= 10) return 10 * pow10;
  if (distance >= 5) return 5 * pow10;
  if (distance >= 3) return 3 * pow10;

  return Math.floor(distance) * pow10;
};

const componentStyles = {
  mapScaleControlStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      zIndex: euiTheme.levels.header,
      left: euiTheme.size.m,
      bottom: euiTheme.size.m,
      pointerEvents: 'none',
      color: euiTheme.colors.textParagraph,
      borderLeft: `2px solid ${euiTheme.colors.textParagraph}99`,
      borderBottom: `2px solid ${euiTheme.colors.textParagraph}99`,
      textAlign: 'right',
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      paddingLeft: euiTheme.size.xs,
      paddingRight: euiTheme.size.xs,
    }),
  mapScaleControlFullScreenStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      bottom: `calc(${euiTheme.size.l} * 2)`,
    }),
};

export const ScaleControl: React.FC<Props> = ({ isFullScreen, mbMap }) => {
  const [label, setLabel] = useState('');
  const [width, setWidth] = useState(0);
  const styles = useMemoCss(componentStyles);
  const onUpdate = useCallback(() => {
    const container = mbMap.getContainer();
    const centerHeight = container.clientHeight / 2;
    const leftLatLon = mbMap.unproject([0, centerHeight]);
    const rightLatLon = mbMap.unproject([MAX_WIDTH, centerHeight]);
    const maxDistanceMeters = leftLatLon.distanceTo(rightLatLon);
    const isKm = maxDistanceMeters >= 1000;
    const unit = isKm
      ? i18n.translate('xpack.maps.kilometersAbbr', { defaultMessage: 'km' })
      : i18n.translate('xpack.maps.metersAbbr', { defaultMessage: 'm' });
    const maxDistance = isKm ? maxDistanceMeters / 1000 : maxDistanceMeters;
    const scaleDistance = getScaleDistance(maxDistance);

    const zoom = mbMap.getZoom();
    const bounds = mbMap.getBounds();
    let nextLabel = `${scaleDistance} ${unit}`;
    if (
      zoom <= 4 ||
      (zoom <= 6 && (bounds.getNorth() > 23.5 || bounds.getSouth() < -23.5)) ||
      (zoom <= 8 && (bounds.getNorth() > 45 || bounds.getSouth() < -45))
    ) {
      nextLabel = `~${nextLabel}`;
    }

    setLabel(nextLabel);
    setWidth(MAX_WIDTH * (scaleDistance / maxDistance));
  }, [mbMap]);

  useEffect(() => {
    mbMap.on('move', onUpdate);
    onUpdate();
    return () => {
      mbMap.off('move', onUpdate);
    };
  }, [mbMap, onUpdate]);

  return (
    <div
      css={[styles.mapScaleControlStyles, isFullScreen && styles.mapScaleControlFullScreenStyles]}
      style={{ width: `${width}px` }}
    >
      {label}
    </div>
  );
};
