/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiText } from '@elastic/eui';
import { LocationLink } from '../monitor_list/monitor_list_drawer';

export const LocationMissingWarning = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const button = (
    <EuiButton iconType="alert" size="s" color="warning" onClick={togglePopover}>
      Geo Information Missing
    </EuiButton>
  );

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
        <EuiPopover
          id="popover"
          button={button}
          isOpen={isPopoverOpen}
          closePopover={togglePopover}
        >
          <EuiText style={{ width: '300px' }}>
            Important geo location configuration is missing. You can use the observer.geo.?? field
            to create distinctive geographic regions for your uptime checks. Get more information in
            our documentation. <LocationLink />
          </EuiText>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
