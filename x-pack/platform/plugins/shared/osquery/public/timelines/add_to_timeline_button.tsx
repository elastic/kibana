/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { isArray } from 'lodash';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  type EuiButtonIconProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import type { AddToTimelineHandler, OsqueryDataProvider } from '../types';

export interface AddToTimelineButtonProps {
  field: string;
  value: string | string[];
  addToTimeline?: AddToTimelineHandler;
  isIcon?: true;
  iconProps?: Partial<EuiButtonIconProps>;
  /** When true, render as EuiContextMenuItem for use inside a context menu */
  displayAsMenuItem?: boolean;
  /** Callback invoked when the menu item is clicked (e.g. to close the kebab popover) */
  onMenuItemClick?: () => void;
  /** Button size when rendered as EuiButtonEmpty (default: 'xs') */
  size?: 'xs' | 's' | 'm';
}

export const SECURITY_APP_NAME = 'Security';

export const AddToTimelineButton = (props: AddToTimelineButtonProps) => {
  const { appName } = useKibana().services;
  const {
    field,
    value,
    isIcon,
    iconProps,
    addToTimeline,
    displayAsMenuItem = false,
    onMenuItemClick,
    size = 'xs',
  } = props;
  const addToTimelineLabel = i18n.translate('xpack.osquery.addToTimelineButtonLabel', {
    defaultMessage: 'Add to Timeline investigation',
  });

  const queryIds = useMemo(() => (isArray(value) ? value : [value]), [value]);

  const providers: OsqueryDataProvider[] = useMemo(
    () =>
      queryIds.map((queryId) => ({
        and: [],
        enabled: true,
        excluded: false,
        id: queryId,
        kqlQuery: '',
        name: queryId,
        queryMatch: {
          field,
          value: queryId,
          operator: ':' as const,
        },
      })),
    [field, queryIds]
  );

  const handleClick = useCallback(() => {
    addToTimeline?.(providers);
  }, [addToTimeline, providers]);

  const handleMenuItemClick = useCallback(() => {
    onMenuItemClick?.();
    handleClick();
  }, [onMenuItemClick, handleClick]);

  if (appName !== SECURITY_APP_NAME || !queryIds.length || !addToTimeline) {
    return null;
  }

  if (displayAsMenuItem) {
    return (
      <EuiContextMenuItem
        icon="timeline"
        onClick={handleMenuItemClick}
        data-test-subj="add-to-timeline"
      >
        {addToTimelineLabel}
      </EuiContextMenuItem>
    );
  }

  if (isIcon) {
    return (
      <EuiButtonIcon
        iconType="timeline"
        aria-label={addToTimelineLabel}
        data-test-subj="add-to-timeline"
        onClick={handleClick}
        size="xs"
        {...iconProps}
      />
    );
  }

  return (
    <EuiButtonEmpty
      size={size}
      iconType="timeline"
      onClick={handleClick}
      data-test-subj="add-to-timeline"
    >
      {addToTimelineLabel}
    </EuiButtonEmpty>
  );
};
