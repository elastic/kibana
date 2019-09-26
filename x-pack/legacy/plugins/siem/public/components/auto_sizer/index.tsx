/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEqual from 'lodash/fp/isEqual';
import React, { useEffect, useRef, useState } from 'react';
import ResizeObserver from 'resize-observer-polyfill';

interface Measurement {
  width?: number;
  height?: number;
}

interface Measurements {
  bounds: Measurement;
  content: Measurement;
  windowMeasurement: Measurement;
}

interface AutoSizerProps {
  bounds?: boolean;
  children: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: { measureRef: (instance: HTMLElement | null) => any } & Measurements
  ) => React.ReactElement;
  content?: boolean;
  detectAnyWindowResize?: boolean;
  onResize?: (size: Measurements) => void;
}

export const AutoSizer = React.memo<AutoSizerProps>(
  ({ bounds = false, children, content = true, detectAnyWindowResize, onResize }) => {
    const element = useRef<HTMLElement | null>(null);
    const resizeObserver = useRef<ResizeObserver | null>(null);
    const windowWidth = useRef(-1);
    const [boundsMeasurement, setBoundsMeasurement] = useState<Measurement>({
      height: 0,
      width: 0,
    });
    const [contentMeasurement, setContentMeasurement] = useState<Measurement>({
      height: 0,
      width: 0,
    });
    const [windowMeasurement, setWindowMeasurement] = useState<Measurement>({
      height: 0,
      width: 0,
    });

    const storeRef = (htmlElement: HTMLElement | null) => {
      if (htmlElement && resizeObserver.current) {
        resizeObserver.current.observe(htmlElement);
      }
      element.current = htmlElement;
    };

    const measure = (entry: ResizeObserverEntry | null) => {
      if (!element.current) {
        return;
      }
      const boundsRect = bounds ? element.current.getBoundingClientRect() : null;

      const boundsMeasurementNow: Measurement = boundsRect
        ? {
            height: element.current.getBoundingClientRect().height,
            width: element.current.getBoundingClientRect().width,
          }
        : boundsMeasurement;

      const windowMeasurementNow: Measurement = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      if (
        detectAnyWindowResize &&
        boundsMeasurementNow &&
        boundsMeasurementNow.width &&
        windowWidth.current !== -1 &&
        windowWidth.current > window.innerWidth
      ) {
        const gap = windowWidth.current - window.innerWidth;
        boundsMeasurementNow.width = boundsMeasurementNow.width - gap;
      }
      windowWidth.current = window.innerWidth;
      const contentRect = content && entry ? entry.contentRect : null;
      const contentMeasurementNow: Measurement =
        contentRect && entry
          ? {
              height: entry.contentRect.height,
              width: entry.contentRect.width,
            }
          : contentMeasurement;

      if (
        isEqual(boundsMeasurementNow, boundsMeasurement) &&
        isEqual(contentMeasurementNow, contentMeasurement) &&
        isEqual(windowMeasurementNow, windowMeasurement)
      ) {
        return;
      }

      requestAnimationFrame(() => {
        if (!resizeObserver) {
          return;
        }

        setBoundsMeasurement(boundsMeasurementNow);
        setContentMeasurement(contentMeasurementNow);
        setWindowMeasurement(windowMeasurementNow);
        if (onResize) {
          onResize({
            bounds: boundsMeasurementNow,
            content: contentMeasurementNow,
            windowMeasurement: windowMeasurementNow,
          });
        }
      });
    };

    useEffect(() => {
      if (detectAnyWindowResize) {
        window.addEventListener('resize', () => measure(null));
      }

      resizeObserver.current = new ResizeObserver(entries => {
        entries.forEach(entry => {
          if (entry.target === element.current) {
            measure(entry);
          }
        });
      });

      return () => {
        if (resizeObserver && resizeObserver.current) {
          resizeObserver.current.disconnect();
          resizeObserver.current = null;
        }
        if (detectAnyWindowResize) {
          window.removeEventListener('resize', () => measure(null));
        }
      };
    }, []);
    return children({
      bounds: boundsMeasurement,
      content: contentMeasurement,
      windowMeasurement,
      measureRef: storeRef,
    });
  }
);

AutoSizer.displayName = 'AutoSizer';
