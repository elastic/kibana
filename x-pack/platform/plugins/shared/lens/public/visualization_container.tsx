/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './visualization_container.scss';

import React from 'react';
import classNames from 'classnames';

export function VisualizationContainer({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-test-subj="lnsVisualizationContainer"
      className={classNames(className, 'lnsVisualizationContainer')}
      {...rest}
    >
      {children}
    </div>
  );
}
