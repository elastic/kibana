/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutResizableProps } from '@elastic/eui';
import { EuiFlyoutResizable, EuiLoadingElastic } from '@elastic/eui';
import React, { Suspense, lazy, useCallback } from 'react';
import { css } from '@emotion/react';
import type { RuleFormProps } from '../src/rule_form';
import type { RuleTypeMetaData } from '../src/types';
import {
  RuleFlyoutUIContextProvider,
  useRuleFlyoutUIContext,
  RuleFormErrorPromptWrapper,
} from '../lib';

const RuleForm: React.LazyExoticComponent<React.FC<RuleFormProps<any>>> = lazy(() =>
  import('../src/rule_form').then((module) => ({ default: module.RuleForm }))
);

const inLineContainerCss = css`
  container-type: inline-size;
`;

interface RuleFormFlyoutRendererProps<MetaData extends RuleTypeMetaData> {
  ruleFormProps: RuleFormProps<MetaData>;
  focusTrapProps?: EuiFlyoutResizableProps['focusTrapProps'];
}

const RuleFormFlyoutRenderer = <MetaData extends RuleTypeMetaData>({
  ruleFormProps,
  focusTrapProps,
}: RuleFormFlyoutRendererProps<MetaData>) => {
  const { onClickClose, hideCloseButton } = useRuleFlyoutUIContext();

  const onClose = useCallback(() => {
    // If onClickClose has been initialized, call it instead of onCancel. onClickClose should be used to
    // determine if the close confirmation modal should be shown. props.onCancel is passed down the component hierarchy
    // and will be called 1) by onClickClose, if the confirmation modal doesn't need to be shown, or 2) by the confirm
    // button on the confirmation modal
    if (onClickClose) {
      onClickClose();
    } else {
      // ONLY call props.onCancel directly from this level of the component hierarcht if onClickClose has not yet been initialized.
      // This will only occur if the user tries to close the flyout while the Suspense fallback is still visible
      ruleFormProps.onCancel?.();
    }
  }, [onClickClose, ruleFormProps]);
  return (
    <EuiFlyoutResizable
      ownFocus
      css={inLineContainerCss}
      onClose={onClose}
      aria-labelledby="flyoutTitle"
      size={620}
      minWidth={500}
      hideCloseButton={hideCloseButton}
      focusTrapProps={focusTrapProps}
    >
      <Suspense
        fallback={
          <RuleFormErrorPromptWrapper hasBorder={false} hasShadow={false}>
            <EuiLoadingElastic size="xl" />
          </RuleFormErrorPromptWrapper>
        }
      >
        <RuleForm {...ruleFormProps} isFlyout focusTrapProps={focusTrapProps} />
      </Suspense>
    </EuiFlyoutResizable>
  );
};

interface RuleFormFlyoutProps<MetaData extends RuleTypeMetaData> extends RuleFormProps<MetaData> {
  focusTrapProps?: EuiFlyoutResizableProps['focusTrapProps'];
}

export const RuleFormFlyout = <MetaData extends RuleTypeMetaData>({
  focusTrapProps,
  ...ruleFormProps
}: RuleFormFlyoutProps<MetaData>) => {
  return (
    <RuleFlyoutUIContextProvider>
      <RuleFormFlyoutRenderer ruleFormProps={ruleFormProps} focusTrapProps={focusTrapProps} />
    </RuleFlyoutUIContextProvider>
  );
};
