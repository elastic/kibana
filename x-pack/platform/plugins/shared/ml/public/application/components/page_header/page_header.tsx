/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, ReactNode } from 'react';
import React, { useContext, useEffect } from 'react';
import { InPortal, OutPortal } from 'react-reverse-portal';
import { EuiSkeletonText } from '@elastic/eui';
import { MlPageControlsContext } from '../ml_page/ml_page';

export const MlPageHeader: FC<
  PropsWithChildren<{
    leftSideItems?: ReactNode | ReactNode[];
    rightSideItems?: ReactNode | ReactNode[];
    restrictWidth?: number;
  }>
> = ({ children, leftSideItems, rightSideItems, restrictWidth }) => {
  const {
    headerPortal,
    leftHeaderPortal,
    rightHeaderPortal,
    setIsHeaderMounted,
    setIsLeftSectionMounted,
    setIsRightSectionMounted,
    setHeaderRestrictWidth,
  } = useContext(MlPageControlsContext);

  useEffect(() => {
    setIsHeaderMounted(true);
    setIsLeftSectionMounted(!!leftSideItems);
    setIsRightSectionMounted(!!rightSideItems);
    setHeaderRestrictWidth(restrictWidth);
    return () => {
      setIsHeaderMounted(false);
      setIsLeftSectionMounted(false);
      setIsRightSectionMounted(false);
      setHeaderRestrictWidth(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftSideItems, rightSideItems, restrictWidth]);

  return (
    <>
      <InPortal node={headerPortal}>{children}</InPortal>
      {leftSideItems ? <InPortal node={leftHeaderPortal}>{leftSideItems}</InPortal> : null}
      {rightSideItems ? <InPortal node={rightHeaderPortal}>{rightSideItems}</InPortal> : null}
    </>
  );
};

export const MlPageHeaderRenderer: FC = () => {
  const { headerPortal, isHeaderMounted } = useContext(MlPageControlsContext);
  return isHeaderMounted ? <OutPortal node={headerPortal} /> : <EuiSkeletonText lines={1} />;
};
