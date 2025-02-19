/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import * as i18n from './translations';

export interface Props {
  /** Optionally render new chat as a link */
  asLink?: boolean;
  children?: React.ReactNode;
  /** Optionally specify color of empty button */
  color?: 'text' | 'accent' | 'primary' | 'success' | 'warning' | 'danger';
  showAssistantOverlay: (show: boolean) => void;
  /** Defaults to `discuss`. If null, the button will not have an icon */
  iconType?: string | null;
  /** Defaults to false. If true, shows icon button without text */
  iconOnly?: boolean;
}

const NewChatByTitleComponent: React.FC<Props> = ({
  asLink = false,
  children = i18n.NEW_CHAT,
  color = 'primary',
  showAssistantOverlay,
  iconType,
  iconOnly = false,
}) => {
  // proxy show / hide calls to assistant context, using our internal prompt context id:
  const showOverlay = useCallback(() => {
    showAssistantOverlay(true);
  }, [showAssistantOverlay]);

  const icon = useMemo(() => {
    if (iconType === null) {
      return undefined;
    }

    return iconType ?? 'discuss';
  }, [iconType]);

  return useMemo(
    () =>
      asLink ? (
        <EuiLink color={color} data-test-subj="newChatLink" onClick={showOverlay}>
          {children}
        </EuiLink>
      ) : iconOnly ? (
        <EuiToolTip content={i18n.NEW_CHAT}>
          <EuiButtonIcon
            data-test-subj="newChatByTitle"
            iconType={icon ?? 'discuss'}
            onClick={showOverlay}
            color={'text'}
            aria-label={i18n.NEW_CHAT}
          />
        </EuiToolTip>
      ) : (
        <EuiButtonEmpty
          color={color}
          data-test-subj="newChatByTitle"
          iconType={icon}
          onClick={showOverlay}
          aria-label={i18n.NEW_CHAT}
        >
          {children}
        </EuiButtonEmpty>
      ),
    [asLink, color, showOverlay, children, iconOnly, icon]
  );
};

NewChatByTitleComponent.displayName = 'NewChatByTitleComponent';

/**
 * `NewChatByTitle` displays a _New chat_ icon button by providing only the `promptContextId`
 * of a context that was (already) registered by the `useAssistantOverlay` hook. You may
 * optionally style the button icon, or override the default _New chat_ text with custom
 * content, like {'🪄✨'}
 *
 * USE THIS WHEN: all the data necessary to start a new chat is NOT available
 * in the same part of the React tree as the _New chat_ button. When paired
 * with the `useAssistantOverlay` hook, this option enables context to be be
 * registered where the data is available, and then the _New chat_ button can be displayed
 * in another part of the tree.
 */
export const NewChatByTitle = React.memo(NewChatByTitleComponent);
