/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiToolTip,
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
  buttonRef?: React.Ref<HTMLAnchorElement>;
}

export const PropertyActions = React.memo<PropertyActionsProps>(
  ({ propertyActions, customDataTestSubj, buttonRef }) => {
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

    const actionItems = propertyActions.flatMap((action, key) => {
      if (action.type === AttachmentActionType.CUSTOM) {
        const customAction = action.render();
        if (customAction == null) {
          return [];
        }
        return [
          <EuiFlexItem grow={false} key={`${action.type}-${key}`}>
            <span>
              <Suspense fallback={<EuiLoadingSpinner />}>{customAction}</Suspense>
            </span>
          </EuiFlexItem>,
        ];
      }

      return [
        <EuiFlexItem grow={false} key={`${action.type}-${key}`}>
          <span>
            <PropertyActionButton
              disabled={action.disabled}
              iconType={action.iconType}
              label={action.label}
              color={action.color}
              onClick={() => onClosePopover(action.onClick)}
              customDataTestSubj={customDataTestSubj}
            />
          </span>
        </EuiFlexItem>,
      ];
    });

    if (actionItems.length === 0) {
      return null;
    }

    return (
      <EuiPopover
        aria-label={i18n.ACTIONS_ARIA}
        anchorPosition="downRight"
        data-test-subj={dataTestSubjPrepend}
        ownFocus
        button={
          <EuiToolTip content={i18n.ACTIONS_ARIA} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj={`${dataTestSubjPrepend}-ellipses`}
              aria-label={i18n.ACTIONS_ARIA}
              iconType="boxesVertical"
              onClick={onButtonClick}
              buttonRef={buttonRef}
            />
          </EuiToolTip>
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
          {actionItems}
        </EuiFlexGroup>
      </EuiPopover>
    );
  }
);

PropertyActions.displayName = 'PropertyActions';

const makeDataTestSubjPrepend = (customDataTestSubj?: string) => {
  return customDataTestSubj == null ? ComponentId : `${ComponentId}-${customDataTestSubj}`;
};
