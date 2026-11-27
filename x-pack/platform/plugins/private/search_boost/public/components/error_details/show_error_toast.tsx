/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { htmlIdGenerator } from '@elastic/eui';
import type { CoreStart, Toast } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { AFFECTED_MODAL_WIDTH } from '../modals/confirm_modal';
import type { ErrorDetailsProps } from './error_details';
import { ErrorDetailsModalContent } from './error_details';
import { VIEW_ERROR_DETAILS_LABEL } from '../../translations';

export type ErrorToastServices = Pick<
  CoreStart,
  'notifications' | 'overlays' | 'rendering' | 'uiSettings'
>;

export interface ErrorToastInput {
  title: string;
  text?: string;
  details: ErrorDetailsProps;
  /** Tries again from the details modal, which closes along with the toast. */
  onRetry?: () => void;
}

export const showErrorToast = (
  { notifications: { toasts }, overlays, rendering, uiSettings }: ErrorToastServices,
  { title, text, details, onRetry }: ErrorToastInput
): Toast => {
  const openDetails = () => {
    const titleId = htmlIdGenerator('searchBoostErrorDetailsTitle')();
    const modal = overlays.openModal(
      toMountPoint(
        <ErrorDetailsModalContent
          {...details}
          titleId={titleId}
          onClose={() => modal.close()}
          onRetry={
            onRetry &&
            (() => {
              modal.close();
              toasts.remove(toast);
              onRetry();
            })
          }
        />,
        rendering
      ),
      {
        maxWidth: AFFECTED_MODAL_WIDTH,
        'aria-labelledby': titleId,
        'data-test-subj': 'searchBoostErrorDetailsModal',
      }
    );
  };

  const toast = toasts.addDanger(
    {
      title,
      text,
      actionProps: {
        primary: {
          children: VIEW_ERROR_DETAILS_LABEL,
          onClick: openDetails,
          'data-test-subj': 'searchBoostErrorViewDetails',
        },
      },
    },
    { toastLifeTimeMs: uiSettings.get('notifications:lifetime:error') }
  );
  return toast;
};
