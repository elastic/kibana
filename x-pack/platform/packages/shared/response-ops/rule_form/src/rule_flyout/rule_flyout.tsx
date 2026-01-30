/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { EuiFlyoutResizableProps } from '@elastic/eui';
import { useRuleFlyoutUIContext } from '../../lib';
import type { RuleFormData, RuleTypeMetaData } from '../types';
import { RuleFormStepId } from '../constants';
import { RuleFlyoutBody } from './rule_flyout_body';
import { RuleFlyoutShowRequest } from './rule_flyout_show_request';
import { useRuleFormScreenContext, useRuleFormState } from '../hooks';
import { RuleFlyoutSelectConnector } from './rule_flyout_select_connector';
import { ConfirmRuleClose } from '../components';

interface RuleFlyoutProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel?: () => void;
  onSave: (formData: RuleFormData) => void;
  onChangeMetaData?: (metadata?: RuleTypeMetaData) => void;
  initialEditStep?: RuleFormStepId;
  focusTrapProps?: EuiFlyoutResizableProps['focusTrapProps'];
}

// This component is only responsible for the CONTENT of the EuiFlyout. See `flyout/rule_form_flyout.tsx` for the
// EuiFlyout itself. This separation is necessary so that the flyout code can be lazy-loaded and still present its loading
// state and finished state within the same EuiFlyout.

export const RuleFlyout = ({
  onSave,
  isEdit = false,
  isSaving = false,
  // Input is named onCancel for consistency with RulePage but rename it to onClose for more clarity on its
  // function within the flyout. This avoids the compulsion to name a function something like onCancelCancel when
  // we're displaying the confirmation modal for closing the flyout.
  onCancel: onClose = () => {},
  onChangeMetaData = () => {},
  initialEditStep,
  focusTrapProps,
}: RuleFlyoutProps) => {
  const [initialStep, setInitialStep] = useState<RuleFormStepId | undefined>(initialEditStep);
  const [isConfirmCloseModalVisible, setIsConfirmCloseModalVisible] = useState(false);

  const {
    isConnectorsScreenVisible,
    isShowRequestScreenVisible,
    setIsShowRequestScreenVisible,
    setIsConnectorsScreenVisible,
  } = useRuleFormScreenContext();
  const onCloseConnectorsScreen = useCallback(() => {
    setInitialStep(RuleFormStepId.ACTIONS);
    setIsConnectorsScreenVisible(false);
  }, [setIsConnectorsScreenVisible]);

  const onOpenShowRequest = useCallback(
    () => setIsShowRequestScreenVisible(true),
    [setIsShowRequestScreenVisible]
  );
  const onCloseShowRequest = useCallback(() => {
    setInitialStep(RuleFormStepId.DETAILS);
    setIsShowRequestScreenVisible(false);
  }, [setIsShowRequestScreenVisible]);

  const onCancelClose = useCallback(() => {
    setIsConfirmCloseModalVisible(false);
  }, []);

  const hideCloseButton = useMemo(
    () => isShowRequestScreenVisible || isConnectorsScreenVisible,
    [isConnectorsScreenVisible, isShowRequestScreenVisible]
  );

  const { touched, onInteraction } = useRuleFormState();
  const { setOnClickClose, setHideCloseButton } = useRuleFlyoutUIContext();

  const onClickCloseOrCancelButton = useCallback(() => {
    if (touched) {
      setIsConfirmCloseModalVisible(true);
    } else {
      onClose();
    }
  }, [touched, setIsConfirmCloseModalVisible, onClose]);

  useEffect(() => {
    setOnClickClose(() => onClickCloseOrCancelButton);
    setHideCloseButton(hideCloseButton);
  }, [setOnClickClose, setHideCloseButton, onClickCloseOrCancelButton, hideCloseButton]);

  return (
    <>
      {isShowRequestScreenVisible ? (
        <RuleFlyoutShowRequest isEdit={isEdit} onClose={onCloseShowRequest} />
      ) : isConnectorsScreenVisible ? (
        <RuleFlyoutSelectConnector onClose={onCloseConnectorsScreen} />
      ) : (
        <RuleFlyoutBody
          onSave={onSave}
          onInteraction={onInteraction}
          onCancel={onClickCloseOrCancelButton}
          isEdit={isEdit}
          isSaving={isSaving}
          onShowRequest={onOpenShowRequest}
          initialStep={initialStep}
          onChangeMetaData={onChangeMetaData}
        />
      )}
      {isConfirmCloseModalVisible && (
        <ConfirmRuleClose
          onCancel={onCancelClose}
          onConfirm={onClose}
          focusTrapProps={focusTrapProps}
        />
      )}
    </>
  );
};
