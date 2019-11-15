/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 *  /!\  These type definitions are temporary until the upstream @elastic/eui
 *       package includes them.
 */

import { IconType, ToolTipPositions } from '@elastic/eui';
import { CommonProps } from '@elastic/eui/src/components/common';
import moment from 'moment';
import { MouseEventHandler, ReactType, Ref } from 'react';
import { JsonObject } from '../common/typed_json';

declare module '@elastic/eui' {
  interface EuiFormControlLayoutIconProps {
    type: IconType;
    side?: 'left' | 'right';
    onClick?: React.MouseEventHandler<Element>;
  }

  interface EuiFormControlLayoutClearIconProps {
    onClick?: React.MouseEventHandler<Element>;
  }

  type EuiSideNavProps = CommonProps & {
    style?: any;
    items: Array<{
      id: string | number;
      name: string;
      items: Array<{
        id: string;
        name: string;
        onClick: () => void;
      }>;
    }>;
    mobileTitle?: React.ReactNode;
    toggleOpenOnMobile?: () => void;
    isOpenOnMobile?: boolean;
  };
  export const EuiSideNav: React.FC<EuiSideNavProps>;

  type EuiErrorBoundaryProps = CommonProps & {
    children: React.ReactNode;
  };

  type EuiSizesResponsive = 'xs' | 's' | 'm' | 'l' | 'xl';
  type EuiResponsiveProps = CommonProps & {
    children: React.ReactNode;
    sizes: EuiSizesResponsive[];
  };

  export const EuiHideFor: React.FunctionComponent<EuiResponsiveProps>;

  export const EuiShowFor: React.FunctionComponent<EuiResponsiveProps>;
}
