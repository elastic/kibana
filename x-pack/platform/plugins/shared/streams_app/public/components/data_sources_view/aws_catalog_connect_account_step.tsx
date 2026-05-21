/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Connect account step — aligned with Observability Add data → AWS (Version 1 wizard). */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiSteps,
  EuiSuperSelect,
  EuiTab,
  EuiTabs,
  EuiText,
  type EuiSuperSelectOption,
  useEuiTheme,
} from '@elastic/eui';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AwsCatalogConnectAwsCliStepContent } from './aws_catalog_connect_aws_cli_step_content';
import { AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME } from './aws_catalog_onboarding_shared';

const AWS_CLOUDFORMATION_QUICK_CREATE_HREF =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate';
const docIamRole = 'https://www.elastic.co/guide/en/observability/current/monitor-aws.html';

type AwsAuthMethodId = 'federated_identity' | 'direct_access_keys' | 'temporary_keys';
type AwsIntegrationAccountScopeId = 'organization' | 'single_account';
type AwsFederatedIdentityTabId = 'new_identity' | 'existing_identity';

export type AwsCatalogAccountConnectionStatus = 'idle' | 'loading' | 'success';

export interface AwsCatalogConnectAccountStepProps {
  readonly accountConnectionStatus: AwsCatalogAccountConnectionStatus;
  readonly onCanContinueChange: (canContinue: boolean) => void;
}

const AWS_AUTH_METHOD_ORDER: readonly AwsAuthMethodId[] = [
  'federated_identity',
  'direct_access_keys',
  'temporary_keys',
] as const;

function awsAuthMethodTitle(id: AwsAuthMethodId): string {
  switch (id) {
    case 'federated_identity':
      return i18n.translate('xpack.streams.dataSources.awsConnect.authMethod.federatedTitle', {
        defaultMessage: 'Federated Identity',
      });
    case 'direct_access_keys':
      return i18n.translate('xpack.streams.dataSources.awsConnect.authMethod.directKeysTitle', {
        defaultMessage: 'Direct Access Keys',
      });
    case 'temporary_keys':
      return i18n.translate('xpack.streams.dataSources.awsConnect.authMethod.temporaryKeysTitle', {
        defaultMessage: 'Temporary Keys',
      });
    default:
      return id;
  }
}

function awsAuthMethodDescription(id: AwsAuthMethodId): string {
  switch (id) {
    case 'federated_identity':
      return i18n.translate('xpack.streams.dataSources.awsConnect.authMethod.federatedDesc', {
        defaultMessage:
          'Elastic assumes an IAM role in your account. Best for production and least-privilege access.',
      });
    case 'direct_access_keys':
      return i18n.translate('xpack.streams.dataSources.awsConnect.authMethod.directKeysDesc', {
        defaultMessage:
          'Long-lived access key ID and secret. Use only when a federated role is not possible.',
      });
    case 'temporary_keys':
      return i18n.translate('xpack.streams.dataSources.awsConnect.authMethod.temporaryKeysDesc', {
        defaultMessage:
          'Short-lived credentials from STS (access key, secret, and session token). Ideal for local or CI workflows.',
      });
    default:
      return '';
  }
}

const AWS_AUTH_METHOD_SUPER_SELECT_OPTIONS: Array<EuiSuperSelectOption<AwsAuthMethodId>> =
  AWS_AUTH_METHOD_ORDER.map((methodId) => ({
    value: methodId,
    'data-test-subj': `streamsAwsCatalogAuthMethod--${methodId}`,
    inputDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <strong>{awsAuthMethodTitle(methodId)}</strong>
        </EuiFlexItem>
        {methodId === 'federated_identity' ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="accent">
              {i18n.translate('xpack.streams.dataSources.awsConnect.authMethod.recommendedBadge', {
                defaultMessage: 'Recommended',
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    ),
    dropdownDisplay: (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <strong>{awsAuthMethodTitle(methodId)}</strong>
          </EuiFlexItem>
          {methodId === 'federated_identity' ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">
                {i18n.translate('xpack.streams.dataSources.awsConnect.authMethod.recommendedBadge', {
                  defaultMessage: 'Recommended',
                })}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p style={{ margin: 0 }}>{awsAuthMethodDescription(methodId)}</p>
        </EuiText>
      </>
    ),
  }));

const AWS_INTEGRATION_ACCOUNT_SCOPE_ORDER: readonly AwsIntegrationAccountScopeId[] = [
  'organization',
  'single_account',
] as const;

function integrationAccountScopeTitle(id: AwsIntegrationAccountScopeId): string {
  switch (id) {
    case 'organization':
      return i18n.translate('xpack.streams.dataSources.awsConnect.accountScope.organizationTitle', {
        defaultMessage: 'AWS Organization',
      });
    case 'single_account':
      return i18n.translate('xpack.streams.dataSources.awsConnect.accountScope.singleAccountTitle', {
        defaultMessage: 'Single Account',
      });
    default:
      return id;
  }
}

function integrationAccountScopeDescription(id: AwsIntegrationAccountScopeId): string {
  switch (id) {
    case 'organization':
      return i18n.translate('xpack.streams.dataSources.awsConnect.accountScope.organizationDesc', {
        defaultMessage:
          'Connect Elastic to every AWS account (current and future) in your environment by giving Elastic read-only configuration access to your AWS organization.',
      });
    case 'single_account':
      return i18n.translate('xpack.streams.dataSources.awsConnect.accountScope.singleAccountDesc', {
        defaultMessage:
          'Use a single account for a quick POC. Choose organization scope to cover every account—including new ones—automatically.',
      });
    default:
      return '';
  }
}

const AWS_INTEGRATION_ACCOUNT_SCOPE_SUPER_SELECT_OPTIONS: Array<
  EuiSuperSelectOption<AwsIntegrationAccountScopeId>
> = AWS_INTEGRATION_ACCOUNT_SCOPE_ORDER.map((scopeId) => ({
  value: scopeId,
  'data-test-subj': `streamsAwsCatalogConnectAccountScopeOption--${scopeId}`,
  inputDisplay: <strong>{integrationAccountScopeTitle(scopeId)}</strong>,
  dropdownDisplay: (
    <>
      <strong>{integrationAccountScopeTitle(scopeId)}</strong>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p style={{ margin: 0 }}>{integrationAccountScopeDescription(scopeId)}</p>
      </EuiText>
    </>
  ),
}));

const awsOnboardingSuperSelectMenuItemGlobalCss = css`
  .${AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}.euiContextMenuItem:where(a, button):not(
      :disabled
    ):hover,
  .${AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}.euiContextMenuItem:where(a, button):not(
      :disabled
    ):focus {
    text-decoration: none !important;
  }
`;

const awsIntentGridFullWidthCellCss = css`
  grid-column: 1 / -1;
  min-width: 0;
`;

export const AwsCatalogConnectAccountStep: React.FC<AwsCatalogConnectAccountStepProps> = ({
  accountConnectionStatus,
  onCanContinueChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const [awsIntegrationAccountScope, setAwsIntegrationAccountScope] =
    useState<AwsIntegrationAccountScopeId>('organization');
  const [awsAuthMethod, setAwsAuthMethod] = useState<AwsAuthMethodId>('federated_identity');
  const [awsFederatedIdentityTab, setAwsFederatedIdentityTab] =
    useState<AwsFederatedIdentityTabId>('new_identity');
  const [awsFederatedIdentityName, setAwsFederatedIdentityName] = useState('');
  const [iamRoleArn, setIamRoleArn] = useState('');
  const [awsExternalId, setAwsExternalId] = useState('');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState('');

  const hasRoleCredentials = Boolean(iamRoleArn.trim());
  const hasExternalId = Boolean(awsExternalId.trim());
  const hasFederatedNewIdentityComplete = Boolean(
    awsFederatedIdentityName.trim() && hasRoleCredentials && hasExternalId
  );
  const hasFederatedExistingIdentityComplete = Boolean(hasRoleCredentials && hasExternalId);
  const hasAccessKeyCredentials = Boolean(awsAccessKeyId.trim() && awsSecretAccessKey.trim());
  const hasTemporaryCredentials = Boolean(
    awsAccessKeyId.trim() && awsSecretAccessKey.trim() && awsSessionToken.trim()
  );

  const canContinueStep1 =
    awsAuthMethod === 'federated_identity'
      ? awsFederatedIdentityTab === 'new_identity'
        ? hasFederatedNewIdentityComplete
        : hasFederatedExistingIdentityComplete
      : awsAuthMethod === 'direct_access_keys'
      ? hasAccessKeyCredentials
      : hasTemporaryCredentials;

  useEffect(() => {
    onCanContinueChange(canContinueStep1);
  }, [canContinueStep1, onCanContinueChange]);

  useEffect(() => {
    return () => {
      onCanContinueChange(false);
    };
  }, [onCanContinueChange]);

  return (
    <>
      <Global styles={awsOnboardingSuperSelectMenuItemGlobalCss} />
      <div
        data-test-subj="streamsAwsCatalogConnectAccountFormLayout"
        css={css`
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: ${euiTheme.size.l};
          align-items: start;
          min-width: 0;
          .euiFormRow {
            row-gap: ${euiTheme.size.s};
          }
        `}
      >
        <div data-test-subj="streamsAwsCatalogConnectAccountScope">
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.observabilityOnboarding.awsPage.configureIntegration.accountTypeLabel',
                    {
                      defaultMessage: 'Account type',
                    }
                  )}
                >
                  <EuiSuperSelect
                    hasDividers
                    fullWidth
                    itemClassName={AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}
                    data-test-subj="streamsAwsCatalogConnectAccountScopeSuperSelect"
                    options={AWS_INTEGRATION_ACCOUNT_SCOPE_SUPER_SELECT_OPTIONS}
                    valueOfSelected={awsIntegrationAccountScope}
                    onChange={(value) => {
                      setAwsIntegrationAccountScope(value);
                    }}
                    popoverProps={{ repositionOnScroll: true }}
                  />
                </EuiFormRow>
                <EuiSpacer size="m" />
                <EuiText size="xs" color="subdued">
                  <p style={{ margin: 0 }}>
                    {integrationAccountScopeDescription(awsIntegrationAccountScope)}
                  </p>
                </EuiText>
              </div>
              <div data-test-subj="streamsAwsCatalogStep1PreferredMethod">
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.observabilityOnboarding.awsPage.step1.authMethod.superSelectLabel',
                    {
                      defaultMessage: 'Authentication method',
                    }
                  )}
                >
                  <EuiSuperSelect
                    hasDividers
                    fullWidth
                    itemClassName={AWS_ONBOARDING_SUPER_SELECT_MENU_ITEM_CLASSNAME}
                    data-test-subj="streamsAwsCatalogStep1AuthMethodSuperSelect"
                    options={AWS_AUTH_METHOD_SUPER_SELECT_OPTIONS}
                    valueOfSelected={awsAuthMethod}
                    onChange={(value) => {
                      setAwsAuthMethod(value);
                    }}
                    popoverProps={{ repositionOnScroll: true }}
                  />
                </EuiFormRow>
              </div>
              <div css={awsIntentGridFullWidthCellCss}>
                {awsAuthMethod === 'federated_identity' ? (
                  <div
                    data-test-subj="streamsAwsCatalogFederatedIdentityCard"
                    css={css`
                      text-align: start;
                      padding-block: ${euiTheme.size.m};
                      .euiFormHelpText {
                        text-align: start;
                      }
                      /*
                       * EuiSteps (titleSize xxs): 16px under the title row; align body with title text
                       * (step number width + titleWrapper gap). !important wins over EUI content insets.
                       */
                      .euiStep__content {
                        margin-block-start: 0 !important;
                        padding-block-start: ${euiTheme.size.base} !important;
                        margin-inline-start: 0 !important;
                        padding-inline-start: calc(
                          ${euiTheme.size.base} + ${euiTheme.size.base}
                        ) !important;
                      }
                    `}
                  >
                    <EuiTabs data-test-subj="streamsAwsCatalogFederatedIdentityTabs">
                      <EuiTab
                        isSelected={awsFederatedIdentityTab === 'new_identity'}
                        onClick={() => setAwsFederatedIdentityTab('new_identity')}
                      >
                        {i18n.translate(
                          'xpack.observabilityOnboarding.awsPage.step1.federated.tabNewIdentity',
                          {
                            defaultMessage: 'New identity',
                          }
                        )}
                      </EuiTab>
                      <EuiTab
                        isSelected={awsFederatedIdentityTab === 'existing_identity'}
                        onClick={() => setAwsFederatedIdentityTab('existing_identity')}
                      >
                        {i18n.translate(
                          'xpack.observabilityOnboarding.awsPage.step1.federated.tabExistingIdentity',
                          {
                            defaultMessage: 'Existing identity',
                          }
                        )}
                      </EuiTab>
                    </EuiTabs>
                    <EuiSpacer size="l" />
                    {awsFederatedIdentityTab === 'new_identity' ? (
                      <>
                        <EuiSteps
                          data-test-subj="streamsAwsCatalogFederatedNewIdentitySteps"
                          headingElement="h3"
                          titleSize="xs"
                          steps={[
                            {
                              step: 1,
                              'data-test-subj': 'streamsAwsCatalogFederatedAwsCliStep',
                              title: i18n.translate(
                                'xpack.streams.dataSources.awsConnect.cli.stepTitle',
                                {
                                  defaultMessage: 'Connect via AWS CLI using a script',
                                }
                              ),
                              children: (
                                <AwsCatalogConnectAwsCliStepContent externalId={awsExternalId} />
                              ),
                            },
                            {
                              step: 2,
                              'data-test-subj': 'awsOnboardingFederatedCloudFormationStep',
                              title: i18n.translate(
                                'xpack.observabilityOnboarding.awsPage.step1.federated.cloudFormationStepTitle',
                                {
                                  defaultMessage: 'Create your IAM role with CloudFormation',
                                }
                              ),
                              children: (
                                <>
                                  <EuiText size="s" color="subdued" component="div">
                                    <p style={{ margin: 0 }}>
                                      {i18n.translate(
                                        'xpack.observabilityOnboarding.awsPage.step1.federated.cloudFormationShortDescription',
                                        {
                                          defaultMessage:
                                            'Open the template in the right AWS account and Region, finish the stack, then copy the Role ARN and External ID from Outputs.',
                                        }
                                      )}{' '}
                                      <EuiLink
                                        data-test-subj="streamsAwsCatalogFederatedIdentityLearnMoreLink"
                                        href={docIamRole}
                                        target="_blank"
                                        external
                                      >
                                        {i18n.translate(
                                          'xpack.observabilityOnboarding.awsPage.step1.federated.learnMore',
                                          {
                                            defaultMessage: 'Learn more',
                                          }
                                        )}
                                      </EuiLink>
                                    </p>
                                  </EuiText>
                                  <EuiSpacer size="m" />
                                  <EuiFlexGroup
                                    alignItems="flexStart"
                                    justifyContent="flexStart"
                                    gutterSize="none"
                                    responsive={false}
                                  >
                                    <EuiFlexItem grow={false}>
                                      <EuiButton
                                        data-test-subj="streamsAwsCatalogFederatedLaunchCloudFormationButton"
                                        iconType="launch"
                                        iconSide="left"
                                        color="primary"
                                        href={AWS_CLOUDFORMATION_QUICK_CREATE_HREF}
                                        target="_blank"
                                      >
                                        {i18n.translate(
                                          'xpack.observabilityOnboarding.awsPage.step1.launchCloudFormation',
                                          {
                                            defaultMessage: 'Launch CloudFormation',
                                          }
                                        )}
                                      </EuiButton>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                </>
                              ),
                            },
                            {
                              step: 3,
                              'data-test-subj': 'awsOnboardingFederatedIdentityInputsStep',
                              title: i18n.translate(
                                'xpack.observabilityOnboarding.awsPage.step1.federated.identityInputsStepTitle',
                                {
                                  defaultMessage: 'Enter your connection details',
                                }
                              ),
                              children: (
                                <>
                                  <EuiFormRow
                                    fullWidth
                                    label={i18n.translate(
                                      'xpack.observabilityOnboarding.awsPage.step1.federated.identityNameLabel',
                                      {
                                        defaultMessage: 'Federated identity name',
                                      }
                                    )}
                                  >
                                    <EuiFieldText
                                      data-test-subj="streamsAwsCatalogFederatedIdentityName"
                                      fullWidth
                                      value={awsFederatedIdentityName}
                                      onChange={(e) => setAwsFederatedIdentityName(e.target.value)}
                                      placeholder={i18n.translate(
                                        'xpack.observabilityOnboarding.awsPage.step1.federated.identityNamePlaceholder',
                                        {
                                          defaultMessage: 'e.g. production-aws-readonly',
                                        }
                                      )}
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                  </EuiFormRow>
                                  <EuiSpacer size="l" />
                                  <EuiFormRow
                                    label={i18n.translate(
                                      'xpack.observabilityOnboarding.awsPage.step1.federated.roleArnLabel',
                                      {
                                        defaultMessage: 'Role ARN',
                                      }
                                    )}
                                    helpText={i18n.translate(
                                      'xpack.observabilityOnboarding.awsPage.step1.arnHelp',
                                      {
                                        defaultMessage:
                                          'Elastic assumes this role to pull logs and metrics from CloudWatch and other AWS APIs.',
                                      }
                                    )}
                                    fullWidth
                                  >
                                    <EuiFieldText
                                      data-test-subj="streamsAwsCatalogStepsIamRoleArn"
                                      fullWidth
                                      value={iamRoleArn}
                                      onChange={(e) => setIamRoleArn(e.target.value)}
                                      placeholder="arn:aws:iam::123456789012:role/ElasticObservability"
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                  </EuiFormRow>
                                  <EuiSpacer size="l" />
                                  <EuiFormRow
                                    fullWidth
                                    label={i18n.translate(
                                      'xpack.observabilityOnboarding.awsPage.step1.federated.externalIdLabel',
                                      {
                                        defaultMessage: 'External ID',
                                      }
                                    )}
                                  >
                                    <EuiFieldText
                                      type="password"
                                      data-test-subj="streamsAwsCatalogFederatedExternalId"
                                      fullWidth
                                      value={awsExternalId}
                                      onChange={(e) => setAwsExternalId(e.target.value)}
                                      autoComplete="off"
                                      spellCheck={false}
                                    />
                                  </EuiFormRow>
                                </>
                              ),
                            },
                          ]}
                        />
                      </>
                    ) : (
                      <>
                        <EuiText size="s" color="subdued">
                          <p style={{ margin: 0 }}>
                            {i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.step1.federated.existingIntro',
                              {
                                defaultMessage:
                                  'Use an IAM role you have already configured for Elastic. Enter the Role ARN and External ID from that role’s trust policy.',
                              }
                            )}
                          </p>
                        </EuiText>
                        <EuiSpacer size="l" />
                        <EuiFormRow
                          label={i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.step1.federated.roleArnLabel',
                            {
                              defaultMessage: 'Role ARN',
                            }
                          )}
                          helpText={i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.step1.arnHelp',
                            {
                              defaultMessage:
                                'Elastic assumes this role to pull logs and metrics from CloudWatch and other AWS APIs.',
                            }
                          )}
                          fullWidth
                        >
                          <EuiFieldText
                            data-test-subj="streamsAwsCatalogStepsIamRoleArnExisting"
                            fullWidth
                            value={iamRoleArn}
                            onChange={(e) => setIamRoleArn(e.target.value)}
                            placeholder="arn:aws:iam::123456789012:role/ElasticObservability"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </EuiFormRow>
                        <EuiSpacer size="l" />
                        <EuiFormRow
                          fullWidth
                          label={i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.step1.federated.externalIdLabel',
                            {
                              defaultMessage: 'External ID',
                            }
                          )}
                        >
                          <EuiFieldText
                            type="password"
                            data-test-subj="streamsAwsCatalogFederatedExternalIdExisting"
                            fullWidth
                            value={awsExternalId}
                            onChange={(e) => setAwsExternalId(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </EuiFormRow>
                      </>
                    )}
                  </div>
                ) : null}
                {awsAuthMethod === 'direct_access_keys' ? (
                  <div data-test-subj="streamsAwsCatalogDirectAccessKeysCard">
                    <EuiFlexGroup
                      alignItems="flexStart"
                      justifyContent="flexStart"
                      gutterSize="none"
                      responsive
                      wrap
                      css={css`
                        gap: 32px;
                      `}
                    >
                      <EuiFlexItem grow={true} style={{ minWidth: 0, textAlign: 'left' }}>
                        <EuiText size="s" color="subdued" style={{ textAlign: 'left' }}>
                          <p style={{ margin: 0 }}>
                            {i18n.translate(
                              'xpack.observabilityOnboarding.awsPage.step1.directAccessKeysCardDescription',
                              {
                                defaultMessage:
                                  'Access keys are long-lived credentials. Launch CloudFormation in AWS to provision a least-privilege IAM user and paste the stack outputs here, or enter keys you already created.',
                              }
                            )}{' '}
                            <EuiLink
                              data-test-subj="streamsAwsCatalogDirectAccessKeysLearnMoreLink"
                              href={docIamRole}
                              target="_blank"
                              external
                            >
                              {i18n.translate(
                                'xpack.observabilityOnboarding.awsPage.step1.directAccessKeysLearnMore',
                                {
                                  defaultMessage: 'Learn more',
                                }
                              )}
                            </EuiLink>
                          </p>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-test-subj="streamsAwsCatalogDirectAccessKeysLaunchCloudFormationButton"
                          iconType="launch"
                          iconSide="left"
                          color="primary"
                          href={AWS_CLOUDFORMATION_QUICK_CREATE_HREF}
                          target="_blank"
                        >
                          {i18n.translate(
                            'xpack.observabilityOnboarding.awsPage.step1.launchCloudFormation',
                            {
                              defaultMessage: 'Launch CloudFormation',
                            }
                          )}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="l" />
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.accessKeyIdLabel',
                        {
                          defaultMessage: 'Access Key ID',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldText
                        data-test-subj="streamsAwsCatalogStepsAccessKeyId"
                        fullWidth
                        value={awsAccessKeyId}
                        onChange={(e) => setAwsAccessKeyId(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                    <EuiSpacer size="l" />
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.secretAccessKeyLabel',
                        {
                          defaultMessage: 'Secret Access Key',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldPassword
                        data-test-subj="streamsAwsCatalogStepsSecretAccessKey"
                        fullWidth
                        value={awsSecretAccessKey}
                        onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                  </div>
                ) : null}
                {awsAuthMethod === 'temporary_keys' ? (
                  <>
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.accessKeyIdLabel',
                        {
                          defaultMessage: 'Access Key ID',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldText
                        data-test-subj="streamsAwsCatalogStepsTemporaryAccessKeyId"
                        fullWidth
                        value={awsAccessKeyId}
                        onChange={(e) => setAwsAccessKeyId(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                    <EuiSpacer size="l" />
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.secretAccessKeyLabel',
                        {
                          defaultMessage: 'Secret Access Key',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldPassword
                        data-test-subj="streamsAwsCatalogStepsTemporarySecretAccessKey"
                        fullWidth
                        value={awsSecretAccessKey}
                        onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                    <EuiSpacer size="l" />
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.sessionTokenLabel',
                        {
                          defaultMessage: 'Session token',
                        }
                      )}
                      helpText={i18n.translate(
                        'xpack.observabilityOnboarding.awsPage.step1.sessionTokenHelp',
                        {
                          defaultMessage:
                            'Paste the session token from your STS-assumed role or temporary credentials.',
                        }
                      )}
                      fullWidth
                    >
                      <EuiFieldText
                        data-test-subj="streamsAwsCatalogStepsSessionToken"
                        fullWidth
                        value={awsSessionToken}
                        onChange={(e) => setAwsSessionToken(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </EuiFormRow>
                  </>
                ) : null}
              </div>
        {accountConnectionStatus === 'success' ? (
          <>
            <EuiSpacer size="l" />
            <EuiCallOut
              data-test-subj="streamsAwsCatalogAccountConnectSuccessCallout"
              title={i18n.translate('xpack.streams.dataSources.awsConnect.successTitle', {
                defaultMessage: 'Connection successful',
              })}
              color="success"
              iconType="check"
            >
              <p style={{ margin: 0 }}>
                {i18n.translate('xpack.streams.dataSources.awsConnect.successBody', {
                  defaultMessage:
                    'Your credentials are valid and Elastic can connect to this AWS account.',
                })}
              </p>
            </EuiCallOut>
          </>
        ) : null}
      </div>
    </>
  );
};
