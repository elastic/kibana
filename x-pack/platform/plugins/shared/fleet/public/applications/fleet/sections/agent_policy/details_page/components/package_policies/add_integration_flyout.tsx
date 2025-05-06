/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
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
  EuiSteps,
  EuiTitle,
} from '@elastic/eui';
import React, { Suspense, useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { Loading } from '../../../../agents/components';
import { ExtensionWrapper } from '../../../../../components';
import {
  SelectedPolicyTab,
  StepConfigurePackagePolicy,
  StepDefinePackagePolicy,
} from '../../../create_package_policy_page/components';
import {
  useAuthz,
  useGetPackageInfoByKeyQuery,
  useGetPackagesQuery,
  useUIExtension,
} from '../../../../../hooks';
import {
  useDevToolsRequest,
  useOnSubmit,
} from '../../../create_package_policy_page/single_page_layout/hooks';
import type { AgentPolicy } from '../../../../../../../../common';
import { getInheritedNamespace } from '../../../../../../../../common/services';
import { useSpaceSettingsContext } from '../../../../../../../hooks/use_space_settings_context';
import type { PackagePolicyEditExtensionComponentProps } from '../../../../../types';

export const AddIntegrationFlyout: React.FunctionComponent<{
  onClose: () => void;
  agentPolicy: AgentPolicy;
}> = ({ onClose, agentPolicy }) => {
  const hasFleetAddAgentsPrivileges = useAuthz().fleet.addAgents;

  // TODO useAvailablePackages
  const {
    data: eprPackages,
    // isLoading: isLoadingAllPackages,
    // error: eprPackageLoadingError,
  } = useGetPackagesQuery({ prerelease: false });

  const options = useMemo(() => {
    return (
      eprPackages?.items.map((pkg) => ({
        label: pkg.title,
        value: pkg.name,
      })) ?? []
    );
  }, [eprPackages]);

  const [selectedOptions, setSelectedOptions] = useState<Array<{ value: string; label: string }>>(
    []
  );
  const [selectedPackage, setSelectedPackage] = useState({
    name: 'system', // 'cloud_security_posture' // 'apm' //'osquery_manager' // 'endpoint', // system
  });
  // console.log('selectedPackage', selectedPackage);

  const onChange = useCallback(
    (selected: any) => {
      setSelectedOptions(selected);
      if (selected.length === 0) {
        return;
      }
      const newPackage = eprPackages?.items.find((pkg) => pkg.name === selected[0].value);
      if (newPackage) {
        setSelectedPackage({
          name: newPackage?.name ?? '',
        });
      }
    },
    [eprPackages]
  );

  const {
    data: packageInfoData,
    error: packageInfoError,
    isLoading: isPackageInfoLoading,
  } = useGetPackageInfoByKeyQuery(
    selectedPackage.name ?? 'system', // 'cloud_security_posture' // 'apm' //'osquery_manager' // 'endpoint', // system
    // selectedPackage.name,
    undefined,
    // selectedPackage.version,
    {
      full: true,
      prerelease: false,
    }
  );

  const packageInfo = useMemo(() => {
    if (packageInfoData && packageInfoData.item) {
      return packageInfoData.item;
    }
  }, [packageInfoData]);
  // console.log('packageInfo', packageInfo);

  const [integrationToEnable, setIntegrationToEnable] = useState<string | undefined>();
  // 'billing'
  const [isFleetExtensionLoaded, setIsFleetExtensionLoaded] = useState<boolean | undefined>(
    undefined
  );
  const spaceSettings = useSpaceSettingsContext();

  const {
    onSubmit,
    updatePackagePolicy,
    packagePolicy,
    agentPolicies,
    // updateAgentPolicies,
    // savedPackagePolicy,
    formState,
    setFormState,
    // navigateAddAgent,
    // navigateAddAgentHelp,
    // setHasAgentPolicyError,
    validationResults,
    hasAgentPolicyError,
    isInitialized,
    handleSetupTechnologyChange,
    allowedSetupTechnologies,
    selectedSetupTechnology,
    defaultSetupTechnology,
    isAgentlessSelected,
  } = useOnSubmit({
    agentCount: 0,
    packageInfo,
    newAgentPolicy: {} as any,
    selectedPolicyTab: SelectedPolicyTab.EXISTING,
    withSysMonitoring: false,
    queryParamsPolicyId: agentPolicy.id,
    // integrationToEnable,
    hasFleetAddAgentsPrivileges,
    setNewAgentPolicy: () => {},
    setSelectedPolicyTab: () => {},
  });

  // TODO packagePolicy is not updated when selected package changes
  // console.log('packagePolicy', packagePolicy);

  const { devtoolRequest } = useDevToolsRequest({
    newAgentPolicy: {} as any,
    packagePolicy,
    selectedPolicyTab: SelectedPolicyTab.EXISTING,
    withSysMonitoring: false,
    packageInfo,
  });

  const handleExtensionViewOnChange = useCallback<
    PackagePolicyEditExtensionComponentProps['onChange']
  >(
    ({ isValid, updatedPolicy, isExtensionLoaded }) => {
      updatePackagePolicy(updatedPolicy);
      setIsFleetExtensionLoaded(isExtensionLoaded);
      setFormState((prevState) => {
        if (prevState === 'VALID' && !isValid) {
          return 'INVALID';
        }
        return prevState;
      });
    },
    [updatePackagePolicy, setFormState]
  );

  const extensionView = useUIExtension(packagePolicy.package?.name ?? '', 'package-policy-create');
  const replaceDefineStepView = useUIExtension(
    packagePolicy.package?.name ?? '',
    'package-policy-replace-define-step'
  );

  const replaceStepConfigurePackagePolicy =
    replaceDefineStepView && packageInfo?.name ? (
      !isInitialized ? (
        <Loading />
      ) : (
        <ExtensionWrapper>
          <replaceDefineStepView.Component
            agentPolicies={agentPolicies}
            packageInfo={packageInfo}
            newPolicy={packagePolicy}
            onChange={handleExtensionViewOnChange}
            validationResults={validationResults}
            isEditPage={false}
            handleSetupTechnologyChange={handleSetupTechnologyChange}
            isAgentlessEnabled={false}
            defaultSetupTechnology={defaultSetupTechnology}
            integrationToEnable={integrationToEnable}
            setIntegrationToEnable={setIntegrationToEnable}
          />
        </ExtensionWrapper>
      )
    ) : undefined;

  const stepConfigurePackagePolicy = useMemo(
    () =>
      isPackageInfoLoading || !isInitialized ? (
        <Loading />
      ) : packageInfo ? (
        <>
          <StepDefinePackagePolicy
            namespacePlaceholder={getInheritedNamespace(
              agentPolicies,
              spaceSettings?.allowedNamespacePrefixes?.[0]
            )}
            packageInfo={packageInfo}
            packagePolicy={packagePolicy}
            updatePackagePolicy={updatePackagePolicy}
            validationResults={validationResults}
            submitAttempted={formState === 'INVALID'}
          />

          {/* TODO move SetupTechnologySelector out of extensionView */}
          {/* {!extensionView && isAgentlessIntegration(packageInfo) && (
            <SetupTechnologySelector
              disabled={false}
              allowedSetupTechnologies={allowedSetupTechnologies}
              setupTechnology={selectedSetupTechnology}
              onSetupTechnologyChange={(value) => {
                handleSetupTechnologyChange(value);
                // agentless doesn't need system integration
                setWithSysMonitoring(value === SetupTechnology.AGENT_BASED);
              }}
              isAgentlessDefault={isAgentlessDefault}
            />
          )} */}

          {/* Only show the out-of-box configuration step if a UI extension is NOT registered */}
          {!extensionView && (
            <StepConfigurePackagePolicy
              packageInfo={packageInfo}
              showOnlyIntegration={integrationToEnable}
              packagePolicy={packagePolicy}
              updatePackagePolicy={updatePackagePolicy}
              validationResults={validationResults}
              submitAttempted={formState === 'INVALID'}
              isAgentlessSelected={isAgentlessSelected}
            />
          )}

          {/* If a package has been loaded, then show UI extension (if any) */}
          {extensionView && packagePolicy.package?.name && (
            <ExtensionWrapper>
              <extensionView.Component
                newPolicy={packagePolicy}
                onChange={handleExtensionViewOnChange}
              />
            </ExtensionWrapper>
          )}
        </>
      ) : (
        <div />
      ),
    [
      isPackageInfoLoading,
      isInitialized,
      packageInfo,
      agentPolicies,
      spaceSettings?.allowedNamespacePrefixes,
      packagePolicy,
      updatePackagePolicy,
      validationResults,
      formState,
      extensionView,
      //   isAgentlessIntegration,
      //   isAgentlessDefault,
      // selectedSetupTechnology,
      integrationToEnable,
      isAgentlessSelected,
      handleExtensionViewOnChange,
      // handleSetupTechnologyChange,
      // allowedSetupTechnologies,
    ]
  );

  const steps: EuiStepProps[] = [
    {
      title: i18n.translate('xpack.fleet.createPackagePolicy.selectIntegrationTitle', {
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
    },
    {
      title: i18n.translate('xpack.fleet.createPackagePolicy.stepConfigurePackagePolicyTitle', {
        defaultMessage: 'Configure integration',
      }),
      'data-test-subj': 'dataCollectionSetupStep',
      children: replaceStepConfigurePackagePolicy || stepConfigurePackagePolicy,
      headingElement: 'h2',
    },
  ];

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
            <EuiSteps steps={steps} />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onClose}
                  flush="left"
                  data-test-subj="editDownloadSourcesFlyout.cancelBtn"
                >
                  <FormattedMessage
                    id="xpack.fleet.settings.editDownloadSourcesFlyout.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isLoading={formState === 'LOADING'}
                  disabled={
                    formState !== 'VALID' ||
                    hasAgentPolicyError ||
                    !validationResults ||
                    isFleetExtensionLoaded === false
                  }
                  onClick={() => {
                    onSubmit();
                    // console.log('devtoolRequest', devtoolRequest);
                  }}
                  data-test-subj="editDownloadSourcesFlyout.submitBtn"
                >
                  <FormattedMessage
                    id="xpack.fleet.settings.editDownloadSourcesFlyout.saveButton"
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
