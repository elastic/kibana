/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
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
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { Loading } from '../../../../agents/components';
import { useGetSettings } from '../../../../../hooks';
import type { AgentPolicy } from '../../../../../../../../common';
import { CreatePackagePolicySinglePage } from '../../../create_package_policy_page/single_page_layout';
import { useAvailablePackages } from '../../../../../../integrations/sections/epm/screens/home/hooks/use_available_packages';
import { PackageIcon } from '../../../../../../../components';

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

  const { filteredCards, isLoading } = useAvailablePackages({
    prereleaseIntegrationsEnabled: prerelease,
  });

  const options = useMemo(() => {
    return filteredCards
      .filter((pkg) => ['integration', 'input'].includes(pkg.type ?? ''))
      .map((pkg) => ({
        label: pkg.title,
        value: pkg.name,
        integration: pkg.integration,
        prepend: (
          <PackageIcon
            packageName={pkg.name}
            version={pkg.version}
            integrationName={pkg.integration}
            size="l"
            tryApi={true}
          />
        ),
      }));
  }, [filteredCards]);

  const [selectedOptions, setSelectedOptions] = useState<
    Array<{ value: string; label: string; integration?: string }>
  >([]);

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [hasErrors, setHasErrors] = useState<boolean>(false);

  const updateHasErrors = useCallback(
    (errors: boolean) => {
      setHasErrors(errors);
    },
    [setHasErrors]
  );

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
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText size="m" color="subdued">
              <FormattedMessage
                id="xpack.fleet.addIntegrationFlyout.selectIntegrationDescription"
                defaultMessage="Search our observability integrations collection."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow fullWidth>
              <EuiComboBox
                fullWidth
                aria-label="Select integration"
                placeholder="Select integrations..."
                singleSelection={{ asPlainText: true }}
                options={options}
                selectedOptions={selectedOptions}
                onChange={onChange}
                isLoading={isLoading}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
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
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiFlexGroup alignItems="baseline" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiTitle>
                      <h2>
                        <FormattedMessage
                          id="xpack.fleet.addIntegrationFlyout.flyoutHeaderTitle"
                          defaultMessage="Add integration to policy"
                        />
                      </h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="subdued">{agentPolicy.name}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="m" color="subdued">
                  <FormattedMessage
                    id="xpack.fleet.addIntegrationFlyout.flyoutHeaderDescription"
                    defaultMessage="You are adding an integration to the selected policy."
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <CreatePackagePolicySinglePage
              from="policy"
              queryParamsPolicyId={agentPolicy.id}
              prerelease={prerelease}
              pkgLabel={selectedOptions[0]?.label}
              pkgName={selectedOptions[0]?.value}
              integration={selectedOptions[0]?.integration}
              addIntegrationFlyoutProps={{
                selectIntegrationStep,
                onSubmitCompleted,
                isSubmitted,
                agentPolicy,
                updateHasErrors,
              }}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
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
                {hasErrors ? (
                  <FormattedMessage
                    id="xpack.fleet.addIntegrationFlyout.errorOnSaveText"
                    defaultMessage="Your integration policy has errors."
                  />
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  disabled={isSubmitted || selectedOptions.length === 0 || hasErrors}
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
