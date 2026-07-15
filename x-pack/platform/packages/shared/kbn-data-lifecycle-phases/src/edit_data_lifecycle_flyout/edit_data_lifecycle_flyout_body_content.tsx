/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RefObject } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { RetentionSelector } from '../retention_selector';
import type { RetentionOption } from '../retention_selector/types';
import { editDataLifecycleFlyoutStrings as strings } from './strings';
import type { DataLifecycleMethod } from './types';
import { getEditDataLifecycleFlyoutBodyContentStyles } from './styles';
import { LifecycleMethodCard } from './lifecycle_method_card';
import { InheritLifecycleSection } from '../inherit_lifecycle_section';

interface InternalInheritArgs {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /**
   * Link rendered below the inherit checkbox to navigate to the inheritance source.
   * Always opens in a new tab.
   */
  link?: { label?: string; href: string };
}

interface InternalMethodArgs {
  value: DataLifecycleMethod;
  onChange: (next: DataLifecycleMethod) => void;
}

interface InternalIlmArgs {
  retentionOptions: RetentionOption[];
  selectedPolicyName?: string;
  isLoadingInherited?: boolean;
  onSelect: (policyName: string) => void;
  onInspect?: (policyName: string) => void;
}

export interface EditDataLifecycleFlyoutBodyContentProps {
  inheritLifecycle: boolean;
  ilmReadOnly?: boolean;
  ilmCardDisabled?: boolean;
  lifecycleMethod: DataLifecycleMethod;
  showLifecycleMethodPicker: boolean;
  inherit?: InternalInheritArgs;
  method?: InternalMethodArgs;
  ilm?: InternalIlmArgs;
  dataStreamLifecycleContent?: React.ReactNode;
  flyoutScrollContainerRef?: RefObject<HTMLElement | null>;
}

export const EditDataLifecycleFlyoutBodyContent = ({
  inheritLifecycle,
  ilmReadOnly = inheritLifecycle,
  ilmCardDisabled = false,
  lifecycleMethod,
  showLifecycleMethodPicker,
  inherit,
  method,
  ilm,
  dataStreamLifecycleContent,
  flyoutScrollContainerRef,
}: EditDataLifecycleFlyoutBodyContentProps) => {
  const { euiTheme } = useEuiTheme();

  const styles = getEditDataLifecycleFlyoutBodyContentStyles({
    euiTheme,
    showLifecycleMethodPicker,
    lifecycleMethod,
  });

  const lifecycleMethodLabelCss = css`
    margin: 0;
    margin-bottom: ${euiTheme.size.xs};
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      <EuiFlexItem grow={false} css={styles.headerSection}>
        {inherit && (
          <>
            <InheritLifecycleSection
              value={inherit.value}
              onChange={inherit.onChange}
              label={inherit.label}
              link={
                inherit.link
                  ? {
                      label: inherit.link.label ?? strings.viewInheritSourceLink,
                      href: inherit.link.href,
                    }
                  : undefined
              }
              checkboxIdPrefix="editDataLifecycle-inheritLifecycle"
            />

            <EuiSpacer size="m" />
          </>
        )}

        {method && (
          <>
            <EuiText size="xs" css={lifecycleMethodLabelCss}>
              {strings.lifecycleMethodTitle}
            </EuiText>

            <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
              <LifecycleMethodCard
                method="dlm"
                selectedMethod={lifecycleMethod}
                disabled={inheritLifecycle}
                onChange={method.onChange}
              />

              <LifecycleMethodCard
                method="ilm"
                selectedMethod={lifecycleMethod}
                disabled={inheritLifecycle || ilmCardDisabled}
                disabledTooltipContent={
                  !inheritLifecycle && ilmCardDisabled
                    ? strings.ilmNoManagePrivilegeTooltip
                    : undefined
                }
                onChange={method.onChange}
              />
            </EuiFlexGroup>
          </>
        )}

        {lifecycleMethod === 'dlm' && dataStreamLifecycleContent && (
          <>
            {showLifecycleMethodPicker && <EuiSpacer size="m" />}
            {dataStreamLifecycleContent}
          </>
        )}

        {showLifecycleMethodPicker && lifecycleMethod === 'ilm' && <EuiSpacer size="m" />}
      </EuiFlexItem>

      {showLifecycleMethodPicker && lifecycleMethod === 'ilm' && (
        <EuiFlexItem grow={false}>
          {!ilm ? (
            <EuiPanel
              hasBorder
              color="subdued"
              paddingSize="l"
              css={styles.noInheritedPolicyPanel}
              data-test-subj="editDataLifecycle-ilmNotConfiguredPanel"
            >
              <EuiText color="subdued" size="s">
                {strings.ilmNotConfiguredDescription}
              </EuiText>
            </EuiPanel>
          ) : inheritLifecycle && ilm.isLoadingInherited ? (
            <EuiPanel
              hasBorder
              color="subdued"
              paddingSize="l"
              css={styles.noInheritedPolicyPanel}
              data-test-subj="editDataLifecycle-loadingInheritedPanel"
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color="subdued" size="s">
                    {strings.loadingInheritedDescription}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          ) : inheritLifecycle && !ilm.selectedPolicyName ? (
            <EuiPanel
              hasBorder
              color="subdued"
              paddingSize="l"
              css={styles.noInheritedPolicyPanel}
              data-test-subj="editDataLifecycle-noInheritedPolicyPanel"
            >
              <EuiText color="subdued" size="s">
                {strings.noInheritedPolicyDescription}
              </EuiText>
            </EuiPanel>
          ) : (
            <RetentionSelector
              options={ilm.retentionOptions}
              selectedOptionName={ilm.selectedPolicyName}
              onSelectOption={ilm.onSelect}
              onInspect={ilm.onInspect}
              isDisabled={ilmReadOnly}
              height="full"
              flyoutScrollContainerRef={flyoutScrollContainerRef}
              showSearch={!ilmReadOnly}
              listStyle={ilmReadOnly ? 'panel' : 'plain'}
              showRowActions={!ilmReadOnly}
              searchPlaceholder={strings.ilmSearchPlaceholder}
              inspectButtonLabel={strings.inspectPolicyAriaLabel}
            />
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
