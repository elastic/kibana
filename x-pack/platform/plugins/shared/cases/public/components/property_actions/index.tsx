/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiLoadingSpinner,
} from '@elastic/eui';

import type { AttachmentAction } from '../../client/attachment_framework/types';

import { AttachmentActionType } from '../../client/attachment_framework/types';
import * as i18n from './translations';

export interface PropertyActionButtonProps {
  disabled?: boolean;
  onClick: () => void;
  iconType: string;
  label: string;
  color?: EuiButtonProps['color'];
  customDataTestSubj?: string;
}

const ComponentId = 'property-actions';

const PropertyActionButton = React.memo<PropertyActionButtonProps>(
  ({ disabled = false, onClick, iconType, label, color, customDataTestSubj }) => {
    const dataTestSubjPrepend = makeDataTestSubjPrepend(customDataTestSubj);

    return (
      <EuiButtonEmpty
        aria-label={label}
        color={color ? color : 'text'}
        data-test-subj={`${dataTestSubjPrepend}-${iconType}`}
        iconSide="left"
        iconType={iconType}
        isDisabled={disabled}
        onClick={onClick}
      >
        {label}
      </EuiButtonEmpty>
    );
  }
);

PropertyActionButton.displayName = 'PropertyActionButton';

export interface PropertyActionsProps {
  propertyActions: AttachmentAction[];
  customDataTestSubj?: string;
}

export const PropertyActions = React.memo<PropertyActionsProps>(
  ({ propertyActions, customDataTestSubj }) => {
    const [showActions, setShowActions] = useState(false);

    const onButtonClick = useCallback(() => {
      setShowActions((prevShowActions) => !prevShowActions);
    }, []);

    const onClosePopover = useCallback((cb?: () => void) => {
      setShowActions(false);
      if (cb != null) {
        cb();
      }
    }, []);

    const dataTestSubjPrepend = makeDataTestSubjPrepend(customDataTestSubj);

    return (
      <EuiPopover
        anchorPosition="downRight"
        data-test-subj={dataTestSubjPrepend}
        ownFocus
        button={
          <EuiButtonIcon
            data-test-subj={`${dataTestSubjPrepend}-ellipses`}
            aria-label={i18n.ACTIONS_ARIA}
            iconType="boxesHorizontal"
            onClick={onButtonClick}
          />
        }
        id="settingsPopover"
        isOpen={showActions}
        closePopover={onClosePopover}
        repositionOnScroll
      >
        <EuiFlexGroup
          alignItems="flexStart"
          data-test-subj={`${dataTestSubjPrepend}-group`}
          direction="column"
          gutterSize="none"
        >
          {propertyActions.map((action, key) => (
            <EuiFlexItem grow={false} key={`${action.type}-${key}`}>
              <span>
                {(action.type === AttachmentActionType.BUTTON && (
                  <PropertyActionButton
                    disabled={action.disabled}
                    iconType={action.iconType}
                    label={action.label}
                    color={action.color}
                    onClick={() => onClosePopover(action.onClick)}
                    customDataTestSubj={customDataTestSubj}
                  />
                )) ||
                  (action.type === AttachmentActionType.CUSTOM && (
                    <Suspense fallback={<EuiLoadingSpinner />}>{action.render()}</Suspense>
                  ))}
              </span>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPopover>
    );
  }
);

PropertyActions.displayName = 'PropertyActions';

const makeDataTestSubjPrepend = (customDataTestSubj?: string) => {
  return customDataTestSubj == null ? ComponentId : `${ComponentId}-${customDataTestSubj}`;
};
