/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useState } from 'react';
import { EuiButton, EuiDescribedFormGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import type { AlertDeleteCategoryIds } from '@kbn/alerting-plugin/common/constants/alert_delete';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import * as i18n from '../translations';

const ModalComponent = lazy(() => import('./modal'));

interface AlertDeleteDescriptiveFormGroupProps {
  services: { http: HttpStart; notifications: NotificationsStart };
  categoryIds: AlertDeleteCategoryIds[];
  isDisabled?: boolean;
}
export const AlertDeleteDescriptiveFormGroup = ({
  services: { http, notifications },
  categoryIds,
  isDisabled = false,
}: AlertDeleteDescriptiveFormGroupProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onCloseModal = () => setIsModalOpen(false);

  const onCleanUpClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <EuiDescribedFormGroup
        title={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <h3>{i18n.RULE_SETTINGS_TITLE}</h3>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        description={
          <EuiText color="subdued" size="s">
            <p>{i18n.RULE_SETTINGS_DESCRIPTION}</p>
          </EuiText>
        }
        css={css`
          flex-wrap: wrap;
        `}
        fieldFlexItemProps={{ css: { flexBasis: '100%' } }}
      >
        <EuiButton
          onClick={onCleanUpClick}
          iconType={'broom'}
          css={{ alignSelf: 'flex-start', width: 'auto' }}
          data-test-subj="alert-delete-open-modal-button"
          disabled={isDisabled}
        >
          {i18n.RUN_CLEANUP_TASK}
        </EuiButton>
      </EuiDescribedFormGroup>
      <Suspense fallback={<></>}>
        <ModalComponent
          services={{ http, notifications }}
          onCloseModal={onCloseModal}
          isVisible={isModalOpen}
          isDisabled={isDisabled}
          categoryIds={categoryIds}
        />
      </Suspense>
    </>
  );
};
