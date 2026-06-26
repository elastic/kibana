/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { ApplicationAttachmentButtonProps } from '@kbn/agent-builder-browser';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { registerApplicationAttachButtonElement } from './attachment_coordinator/coordinator_bridge';
import { useApplicationAttachmentState } from './use_application_attachment_state';

const labels = {
  attach: i18n.translate('xpack.agentBuilder.applicationAttachmentButton.attach', {
    defaultMessage: 'Attach to agent',
  }),
  alreadyAttached: i18n.translate(
    'xpack.agentBuilder.applicationAttachmentButton.alreadyAttached',
    {
      defaultMessage: 'Already attached',
    }
  ),
};

export const ApplicationAttachmentButton: React.FC<ApplicationAttachmentButtonProps> = ({
  getAttachment,
  linkDescriptor,
  iconType = 'documents',
  disabled = false,
  displayVariant = 'default',
}) => {
  const { euiTheme } = useEuiTheme();
  const buttonWrapperRef = useRef<HTMLDivElement | null>(null);
  const { canAttach, isLinked, attach } = useApplicationAttachmentState({
    getAttachment,
    linkDescriptor,
    iconType,
  });

  const setButtonWrapperRef = useCallback((node: HTMLDivElement | null) => {
    buttonWrapperRef.current = node;
    registerApplicationAttachButtonElement(node);
  }, []);

  useEffect(() => {
    return () => {
      registerApplicationAttachButtonElement(null);
    };
  }, []);

  const handleClick = useCallback(() => {
    void attach(buttonWrapperRef.current);
  }, [attach]);

  const isDisabled = disabled || (!canAttach && !isLinked);
  const tooltip = isLinked ? labels.alreadyAttached : labels.attach;
  const buttonIconType = isLinked ? 'link' : 'paperClip';

  const isAppHeader = displayVariant === 'appHeader';
  const appHeaderIconButton = useMemo(
    () =>
      css`
        color: ${euiTheme.colors.textSubdued};
      `,
    [euiTheme.colors.textSubdued]
  );

  return (
    <EuiToolTip content={tooltip} disableScreenReaderOutput>
      <div
        ref={setButtonWrapperRef}
        css={css`
          display: inline-flex;
        `}
      >
        <EuiButtonIcon
          color="text"
          iconType={buttonIconType}
          aria-label={tooltip}
          disabled={isDisabled}
          onClick={handleClick}
          display={isAppHeader ? 'empty' : undefined}
          size={isAppHeader ? 'xs' : undefined}
          css={isAppHeader ? appHeaderIconButton : undefined}
          data-test-subj="agentBuilderApplicationAttachmentButton"
        />
      </div>
    </EuiToolTip>
  );
};
