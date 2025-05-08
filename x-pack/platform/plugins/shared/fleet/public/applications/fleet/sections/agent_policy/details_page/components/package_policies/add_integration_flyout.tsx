/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { Loading } from '../../../../agents/components';
import { useGetPackagesQuery, useGetSettings } from '../../../../../hooks';
import type { AgentPolicy } from '../../../../../../../../common';
import { CreatePackagePolicySinglePage } from '../../../create_package_policy_page/single_page_layout';

export const AddIntegrationFlyout: React.FunctionComponent<{
  onClose: () => void;
  agentPolicy: AgentPolicy;
}> = ({ onClose, agentPolicy }) => {
  const [prerelease, setPrerelease] = React.useState<boolean>(false);
  const { data: settings } = useGetSettings();

  useEffect(() => {
    const isEnabled = Boolean(settings?.item.prerelease_integrations_enabled);
    if (settings?.item) {
      setPrerelease(isEnabled);
    }
  }, [settings?.item]);

  // TODO useAvailablePackages
  const {
    data: eprPackages,
    // isLoading: isLoadingAllPackages,
    // error: eprPackageLoadingError,
  } = useGetPackagesQuery({ prerelease });

  const options = useMemo(() => {
    return (
      eprPackages?.items.map((pkg) => ({
        label: pkg.title,
        value: pkg.name,
      })) ?? []
    );
  }, [eprPackages]);

  const [selectedOptions, setSelectedOptions] = useState<Array<{ value: string; label: string }>>([
    // { value: 'system', label: 'System' },
  ]);

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const onChange = useCallback((selected: any) => {
    setSelectedOptions(selected);
  }, []);

  const selectIntegrationStep = {
    title: i18n.translate('xpack.fleet.addIntegrationFlyout.selectIntegrationTitle', {
      defaultMessage: 'Select integration',
    }),
    'data-test-subj': 'selectIntegrationStep',
    children: (
      <>
        <EuiComboBox
          aria-label="Accessible screen reader label"
          placeholder="Select a single option"
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selectedOptions}
          onChange={onChange}
        />
      </>
    ),
    headingElement: 'h2',
  };

  const onSubmitCompleted = useCallback(() => {
    setIsSubmitted(false);
    onClose();
  }, [onClose]);

  return (
    <Suspense fallback={<Loading />}>
      <EuiErrorBoundary>
        <EuiFlyout onClose={onClose} data-test-subj="addIntegrationFlyout">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle>
              <h2>Add integration to policy</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <CreatePackagePolicySinglePage
              from="policy"
              queryParamsPolicyId={agentPolicy.id}
              prerelease={prerelease}
              pkgName={selectedOptions[0]?.value}
              addIntegrationFlyoutProps={{
                selectIntegrationStep,
                onSubmitCompleted,
                isSubmitted,
                agentPolicy,
              }}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onClose}
                  flush="left"
                  data-test-subj="addIntegrationFlyout.cancelBtn"
                >
                  <FormattedMessage
                    id="xpack.fleet.addIntegrationFlyout.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  disabled={isSubmitted}
                  isLoading={isSubmitted}
                  onClick={() => {
                    setIsSubmitted(true);
                  }}
                  data-test-subj="addIntegrationFlyout.submitBtn"
                >
                  <FormattedMessage
                    id="xpack.fleet.addIntegrationFlyout.submitButton"
                    defaultMessage="Add integration"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </EuiErrorBoundary>
    </Suspense>
  );
};
