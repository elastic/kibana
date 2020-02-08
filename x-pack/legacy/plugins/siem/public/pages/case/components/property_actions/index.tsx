/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPopover, EuiButtonIcon, EuiButtonEmpty } from '@elastic/eui';

export interface PropertyActionButtonProps {
  onClick: () => void;
  iconType: string;
  label: string;
}

const PropertyActionButton = React.memo<PropertyActionButtonProps>(
  ({ onClick, iconType, label }) => (
    <EuiButtonEmpty
      aria-label={label}
      color="text"
      iconSide="left"
      iconType={iconType}
      onClick={onClick}
    >
      {label}
    </EuiButtonEmpty>
  )
);

PropertyActionButton.displayName = 'PropertyActionButton';

export interface PropertyActionsProps {
  propertyActions: PropertyActionButtonProps[];
}

// const propertyActions = [
//   {
//     iconType: 'documentEdit',
//     label: 'Edit description',
//     onClick: () => null,
//   },
//   {
//     iconType: 'securitySignalResolved',
//     label: 'Close case',
//     onClick: () => null,
//   },
//   {
//     iconType: 'trash',
//     label: 'Delete case',
//     onClick: () => null,
//   },
//   {
//     iconType: 'importAction',
//     label: 'Push as ServiceNow incident',
//     onClick: () => null,
//   },
//   {
//     iconType: 'popout',
//     label: 'View ServiceNow incident',
//     onClick: () => null,
//   },
//   {
//     iconType: 'importAction',
//     label: 'Update ServiceNow incident',
//     onClick: () => null,
//   },
// ];

export const PropertyActions = React.memo<PropertyActionsProps>(({ propertyActions }) => {
  const [showActions, setShowActions] = useState(false);

  const onButtonClick = useCallback(() => {
    setShowActions(!showActions);
  }, [showActions]);

  const onClosePopover = useCallback((cb?: () => void) => {
    setShowActions(false);
    if (cb) {
      cb();
    }
  }, []);

  return (
    <EuiFlexGroup alignItems="flexStart" data-test-subj="properties-right" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiPopover
          anchorPosition="downRight"
          button={
            <EuiButtonIcon
              data-test-subj="ellipses"
              iconType="boxesHorizontal"
              onClick={onButtonClick}
            />
          }
          id="settingsPopover"
          isOpen={showActions}
          closePopover={onClosePopover}
        >
          <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="none">
            {propertyActions.map(action => (
              <EuiFlexItem grow={false}>
                <PropertyActionButton
                  iconType={action.iconType}
                  label={action.label}
                  onClick={() => onClosePopover(action.onClick)}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

PropertyActions.displayName = 'PropertyActions';
