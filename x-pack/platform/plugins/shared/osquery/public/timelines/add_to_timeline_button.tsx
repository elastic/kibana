/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { isArray } from 'lodash';
import { EuiButtonEmpty, EuiButtonIcon, type EuiButtonIconProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import type { AddToTimelineHandler, OsqueryDataProvider } from '../types';

export interface AddToTimelineButtonProps {
  field: string;
  value: string | string[];
  addToTimeline?: AddToTimelineHandler;
  isIcon?: true;
  iconProps?: Partial<EuiButtonIconProps>;
}

export const SECURITY_APP_NAME = 'Security';

export const AddToTimelineButton = (props: AddToTimelineButtonProps) => {
  const { appName } = useKibana().services;
  const { field, value, isIcon, iconProps, addToTimeline } = props;
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

  if (appName !== SECURITY_APP_NAME || !queryIds.length || !addToTimeline) {
    return null;
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
      size="xs"
      iconType="timeline"
      onClick={handleClick}
      data-test-subj="add-to-timeline"
    >
      {addToTimelineLabel}
    </EuiButtonEmpty>
  );
};
