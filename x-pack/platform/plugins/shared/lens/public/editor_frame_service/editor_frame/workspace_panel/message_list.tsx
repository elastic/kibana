/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';
import './message_list.scss';

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiText,
  EuiButton,
  EuiIcon,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css, SerializedStyles } from '@emotion/react';
import { UserMessage } from '../../../types';

export const MessageList = ({
  messages,
  customButtonStyles,
}: {
  messages: UserMessage[];
  customButtonStyles?: SerializedStyles;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  let warningCount = 0;
  let errorCount = 0;

  messages.forEach(({ severity }) => {
    if (severity === 'warning') {
      warningCount++;
    } else {
      errorCount++;
    }
  });

  const buttonLabel =
    errorCount > 0 && warningCount > 0
      ? i18n.translate('xpack.lens.messagesButton.label.errorsAndWarnings', {
          defaultMessage:
            '{errorCount} {errorCount, plural, one {error} other {errors}}, {warningCount} {warningCount, plural, one {warning} other {warnings}}',
          values: {
            errorCount,
            warningCount,
          },
        })
      : errorCount > 0
      ? i18n.translate('xpack.lens.messagesButton.label.errors', {
          defaultMessage: '{errorCount} {errorCount, plural, one {error} other {errors}}',
          values: {
            errorCount,
          },
        })
      : i18n.translate('xpack.lens.messagesButton.label.warnings', {
          defaultMessage: '{warningCount} {warningCount, plural, one {warning} other {warnings}}',
          values: {
            warningCount,
          },
        });

  const onButtonClick = () => setIsPopoverOpen((isOpen) => !isOpen);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <EuiToolTip content={buttonLabel}>
          <EuiButton
            minWidth={0}
            color={errorCount ? 'danger' : 'warning'}
            onClick={onButtonClick}
            className="lnsWorkspaceWarning__button"
            data-test-subj="lens-message-list-trigger"
            title={buttonLabel}
            css={customButtonStyles}
          >
            {errorCount > 0 && (
              <>
                <EuiIcon type="error" />
                {errorCount}
              </>
            )}
            {warningCount > 0 && (
              <>
                <EuiIcon
                  type="alert"
                  css={css`
                    margin-left: 4px;
                  `}
                />
                {warningCount}
              </>
            )}
          </EuiButton>
        </EuiToolTip>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <ul className="lnsWorkspaceWarningList">
        {messages.map(({ hidePopoverIcon = false, ...message }, index) => (
          <li
            key={index}
            className="lnsWorkspaceWarningList__item"
            data-test-subj={`lens-message-list-${message.severity}`}
          >
            {typeof message.longMessage === 'function' ? (
              message.longMessage(closePopover)
            ) : (
              <EuiFlexGroup
                gutterSize="s"
                responsive={false}
                className="lnsWorkspaceWarningList__textItem"
              >
                {!hidePopoverIcon && (
                  <EuiFlexItem grow={false}>
                    {message.severity === 'error' ? (
                      <EuiIcon type="error" color="danger" />
                    ) : (
                      <EuiIcon type="alert" color="warning" />
                    )}
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={1} className="lnsWorkspaceWarningList__description">
                  <EuiText size="s">{message.longMessage}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </li>
        ))}
      </ul>
    </EuiPopover>
  );
};
