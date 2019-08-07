/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiPopover } from '@elastic/eui';
import { ReferenceInfo } from '../../../model/commit';

interface Props {
  branches: ReferenceInfo[];
  tags: ReferenceInfo[];
}

export const BranchSelector = (props: Props) => {
  const [isPopoverOpen, togglePopoverOpen] = useState(false);
  return (
    <EuiPopover
      id={''}
      isOpen={isPopoverOpen}
      hasArrow={false}
      button={<div />}
      closePopover={() => togglePopoverOpen(false)}
    ></EuiPopover>
  );
};
