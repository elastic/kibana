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
    <div className="mappings-editor__edit-field__advanced-settings">
      <div>
        <EuiButtonEmpty onClick={toggleIsVisilbe}>
          {isVisible ? 'Hide' : 'Show'} advanced settings
        </EuiButtonEmpty>
      </div>
      <div style={{ display: isVisible ? 'block' : 'none' }}>
        <EuiSpacer size="s" />
        {/* We ned to wrap the children inside a "div" to have our css :first-child rule */}
        <div>{children}</div>
      </div>
    </div>
  );
};
