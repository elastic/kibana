/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

interface DraggingContainerProps {
  children: JSX.Element;
  onDragging: Function;
}

export const DraggingContainer = ({ children, onDragging }: DraggingContainerProps) => {
  useEffect(() => {
    onDragging(true);

    return () => onDragging(false);
  });

  return children;
};
