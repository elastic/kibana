/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EUI_MODAL_CONFIRM_BUTTON } from '@elastic/eui';

import type { StartAction } from './use_start_action';

export const StartActionModal: FC<StartAction> = ({ closeModal, item, startAndCloseModal }) => {
  return (
    <>
      {item !== undefined && (
        <EuiConfirmModal
          title={i18n.translate('xpack.ml.dataframe.analyticsList.startModalTitle', {
            defaultMessage: 'Start {analyticsId}?',
            values: { analyticsId: item.config.id },
          })}
          onCancel={closeModal}
          onConfirm={startAndCloseModal}
          cancelButtonText={i18n.translate(
            'xpack.ml.dataframe.analyticsList.startModalCancelButton',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'xpack.ml.dataframe.analyticsList.startModalStartButton',
            {
              defaultMessage: 'Start',
            }
          )}
          defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
          buttonColor="primary"
        >
          <p>
            {i18n.translate('xpack.ml.dataframe.analyticsList.startModalBody', {
              defaultMessage:
                'A data frame analytics job increases search and indexing load in your cluster. If excessive load occurs, stop the job.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
