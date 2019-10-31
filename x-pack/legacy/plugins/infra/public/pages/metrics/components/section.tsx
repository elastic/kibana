/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  useContext,
  Children,
  isValidElement,
  cloneElement,
  FunctionComponent,
  useMemo,
} from 'react';
import { EuiTitle } from '@elastic/eui';
import { SideNavContext, SubNavItem } from '../lib/side_nav_context';
import { LayoutProps } from '../types';

type SectionProps = LayoutProps & {
  navLabel: string;
  sectionLabel: string;
};

export const Section: FunctionComponent<SectionProps> = ({
  children,
  metrics,
  navLabel,
  sectionLabel,
  onChangeRangeTime,
  isLiveStreaming,
  stopLiveStreaming,
}) => {
  const { addNavItem } = useContext(SideNavContext);
  const subNavItems: SubNavItem[] = [];

  const childrenWithProps = useMemo(
    () =>
      Children.map(children, child => {
        if (isValidElement(child)) {
          const metric = (metrics && metrics.find(m => m.id === child.props.id)) || null;
          if (metric) {
            subNavItems.push({
              id: child.props.id,
              name: child.props.label,
              onClick: () => {
                const el = document.getElementById(child.props.id);
                if (el) {
                  el.scrollIntoView();
                }
              },
            });
          }
          return cloneElement(child, {
            metrics,
            onChangeRangeTime,
            isLiveStreaming,
            stopLiveStreaming,
          });
        }
        return null;
      }),
    [children, metrics, onChangeRangeTime, isLiveStreaming, stopLiveStreaming]
  );

  if (metrics && subNavItems.length) {
    addNavItem({ id: navLabel, name: navLabel, items: subNavItems });
    return (
      <div>
        <EuiTitle>
          <h1>{sectionLabel}</h1>
        </EuiTitle>
        {childrenWithProps}
      </div>
    );
  }

  return null;
};
