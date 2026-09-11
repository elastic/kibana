/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

const CREATE_TITLE = i18n.translate('xpack.alertingV2.actionPolicy.formPage.createTitle', {
  defaultMessage: 'Create action policy',
});

const EDIT_TITLE = i18n.translate('xpack.alertingV2.actionPolicy.formPage.editTitle', {
  defaultMessage: 'Edit action policy',
});

const BACK_LABEL = i18n.translate('xpack.alertingV2.actionPolicy.formPage.backToListLabel', {
  defaultMessage: 'Action Policies',
});

const CREATE_BUTTON_LABEL = i18n.translate('xpack.alertingV2.actionPolicy.formPage.save', {
  defaultMessage: 'Create policy',
});

const UPDATE_BUTTON_LABEL = i18n.translate('xpack.alertingV2.actionPolicy.formPage.update', {
  defaultMessage: 'Update policy',
});

export interface ActionPolicyFormHeaderProps {
  isEditMode: boolean;
  listHref: string;
  onBack: () => void;
  onSubmit?: () => void;
  isSubmitEnabled?: boolean;
  isLoading?: boolean;
}

export const ActionPolicyFormHeader = ({
  isEditMode,
  listHref,
  onBack,
  onSubmit,
  isSubmitEnabled = false,
  isLoading = false,
}: ActionPolicyFormHeaderProps) => {
  const menu = useMemo((): AppHeaderMenu | undefined => {
    if (!onSubmit) {
      return undefined;
    }

    return {
      primaryActionItem: {
        id: 'submitActionPolicy',
        label: isEditMode ? UPDATE_BUTTON_LABEL : CREATE_BUTTON_LABEL,
        iconType: 'check',
        run: onSubmit,
        isLoading,
        disableButton: !isSubmitEnabled || isLoading,
        testId: 'submitButton',
      },
    };
  }, [isEditMode, isLoading, isSubmitEnabled, onSubmit]);

  return (
    <>
      <AppHeader
        sticky={false}
        title={isEditMode ? EDIT_TITLE : CREATE_TITLE}
        spacing="bleed"
        back={{
          href: listHref,
          label: BACK_LABEL,
          onClick: (event) => {
            event.preventDefault();
            onBack();
          },
        }}
        menu={menu}
        showAddIntegrations={false}
      />
      <EuiSpacer size="m" />
    </>
  );
};
