/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { isValidElement, cloneElement, FunctionComponent, Children, useMemo } from 'react';
import { EuiTitle } from '@elastic/eui';
import { InventoryMetric } from '../../../../common/inventory_models/types';
import { LayoutProps } from '../types';

type SubSectionProps = LayoutProps & {
  id: InventoryMetric;
  label?: string;
};

export const SubSection: FunctionComponent<SubSectionProps> = ({
  id,
  label,
  children,
  metrics,
  onChangeRangeTime,
  isLiveStreaming,
  stopLiveStreaming,
}) => {
  if (!children || !metrics) {
    return null;
  }
  const metric = metrics.find(m => m.id === id);
  if (!metric) {
    return null;
  }
  const childrenWithProps = useMemo(
    () =>
      Children.map(children, child => {
        if (isValidElement(child)) {
          return cloneElement(child, {
            metric,
            id,
            onChangeRangeTime,
            isLiveStreaming,
            stopLiveStreaming,
          });
        }
        return null;
      }),
    [children, metric, id, onChangeRangeTime, isLiveStreaming, stopLiveStreaming]
  );
  return (
    <div style={{ margin: '10px 0 16px 0' }} id={id}>
      {label ? (
        <EuiTitle size="s">
          <h4>{label}</h4>
        </EuiTitle>
      ) : null}
      {childrenWithProps}
    </div>
  );
};
