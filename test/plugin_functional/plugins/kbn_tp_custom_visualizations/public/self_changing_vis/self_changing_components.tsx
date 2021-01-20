/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect } from 'react';

import { EuiBadge } from '@elastic/eui';

interface SelfChangingComponentProps {
  renderComplete: () => {};
  visParams: {
    counter: number;
  };
}

export function SelfChangingComponent(props: SelfChangingComponentProps) {
  useEffect(() => {
    props.renderComplete();
  });

  return (
    <div>
      <EuiBadge
        onClick={() => {}}
        data-test-subj="counter"
        onClickAriaLabel="Increase counter"
        color="primary"
      >
        {props.visParams.counter}
      </EuiBadge>
    </div>
  );
}
