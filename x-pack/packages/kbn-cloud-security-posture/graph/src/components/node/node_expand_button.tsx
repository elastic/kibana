/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { StyledNodeExpandButton, RoundEuiButtonIcon, ExpandButtonSize } from './styles';

export interface NodeExpandButtonProps {
  x?: string;
  y?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>, unToggleCallback: () => void) => void;
}

export const NodeExpandButton = ({ x, y, onClick }: NodeExpandButtonProps) => {
  // State to track whether the icon is "plus" or "minus"
  const [isToggled, setIsToggled] = useState(false);

  const unToggleCallback = useCallback(() => {
    setIsToggled(false);
  }, []);

  const onClickHandler = (e: React.MouseEvent<HTMLElement>) => {
    setIsToggled((currIsToggled) => !currIsToggled);
    onClick?.(e, unToggleCallback);
  };

  return (
    <StyledNodeExpandButton x={x} y={y} className={isToggled ? 'toggled' : undefined}>
      <RoundEuiButtonIcon
        color="primary"
        iconType={isToggled ? 'minusInCircleFilled' : 'plusInCircleFilled'}
        onClick={onClickHandler}
        iconSize="m"
        aria-label="Open or close node actions"
      />
    </StyledNodeExpandButton>
  );
};

NodeExpandButton.ExpandButtonSize = ExpandButtonSize;
