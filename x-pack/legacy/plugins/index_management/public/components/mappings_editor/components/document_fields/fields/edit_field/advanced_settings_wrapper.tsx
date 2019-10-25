/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';

import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

interface Props {
  children: React.ReactNode;
}

export const AdvancedSettingsWrapper = ({ children }: Props) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const toggleIsVisilbe = () => {
    setIsVisible(!isVisible);
  };

  return (
    <>
      <div>
        <EuiButtonEmpty onClick={toggleIsVisilbe}>
          {isVisible ? 'Hide' : 'Show'} advanced settings
        </EuiButtonEmpty>
      </div>
      {isVisible && (
        <>
          <EuiSpacer size="l" />
          {children}
        </>
      )}
    </>
  );
};
