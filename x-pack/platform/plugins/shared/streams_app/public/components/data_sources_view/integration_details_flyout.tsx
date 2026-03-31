/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPagination,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { type IntegrationTile } from './data_sources_catalog_flyout';
import { AwsFlyout } from './aws_flyout';
import { KubernetesFlyout } from './kubernetes_flyout';
import {
  AWS_SERVICES,
  CATEGORY_COLORS,
  type AwsService,
  type ServiceCategory,
} from './aws_services_data';

// ─── Logo icons ───────────────────────────────────────────────────────────────

const IconBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderRadius: 8,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
};

const CardLogoIcon: React.FC<{ src: string; alt: string; size?: number }> = ({
  src,
  alt,
  size = 20,
}) => {
  const { euiTheme } = useEuiTheme();
  const [errored, setErrored] = React.useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size + 8 * 2,
        height: size + 8 * 2,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderRadius: 8,
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        flexShrink: 0,
      }}
    >
      {errored ? (
        <EuiIcon type="logoElastic" size="s" color="text" />
      ) : (
        <img
          src={src}
          alt={alt}
          style={{ width: size, height: size, objectFit: 'contain' }}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
};


// ─── Service data ─────────────────────────────────────────────────────────────
// AWS_SERVICES, AwsService, ServiceCategory, CATEGORY_COLORS imported from ./aws_services_data

// ─── Cloud Connector credentials guide ────────────────────────────────────────

const CloudConnectorGuide: React.FC<{ onSetup: () => void }> = ({ onSetup }) => (
  <EuiPanel color="subdued" paddingSize="s" hasBorder>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="lock" size="m" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong>AWS credentials via Cloud Connector</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          Link your AWS account securely — CloudFormation handles the IAM Role automatically.
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="warning">Required</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" onClick={onSetup} iconType="lock">
          Set up
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

// ─── Cloud Connector setup flyout ─────────────────────────────────────────────

const GENERATED_EXTERNAL_ID = 'ext-8f3a2c1d-4b5e-4f6a-9b0c';

const EXISTING_CONNECTORS: Array<{ name: string; arn: string }> = [
  { name: 'prod-aws-us-east-1', arn: 'arn:aws:iam::123456789012:role/ElasticRole' },
];

const CloudConnectorSetupFlyout: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [connectorName, setConnectorName] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [verifyState, setVerifyState] = useState<'idle' | 'loading' | 'success'>('idle');

  const canVerify = !!connectorName && !!roleArn;

  const handleVerify = () => {
    setVerifyState('loading');
    setTimeout(() => setVerifyState('success'), 1800);
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="cloudConnectorFlyoutTitle"
      ownFocus={false}
      flyoutMenuProps={{ title: 'Cloud Connector' }}
      css={css`
        inline-size: 36vw !important;
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        ${flyoutPaddingCss}
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <IconBox><EuiIcon type="lock" size="l" color="primary" /></IconBox>
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiTitle size="s">
              <h2 id="cloudConnectorFlyoutTitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Connect your AWS account</h2>
            </EuiTitle>
            <div style={{ height: 22, marginTop: 4, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              <EuiText size="xs" color="subdued" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Using Cloud Connector via IAM Role
              </EuiText>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiTabs size="s" bottomBorder>
          <EuiTab isSelected={activeTab === 'new'} onClick={() => setActiveTab('new')}>
            New connection
          </EuiTab>
          <EuiTab isSelected={activeTab === 'existing'} onClick={() => setActiveTab('existing')}>
            Existing connections
          </EuiTab>
        </EuiTabs>

        <EuiSpacer size="l" />

        {activeTab === 'new' ? (
          <EuiSteps
            titleSize="xxs"
            css={css`
              .euiStep__content {
                padding-block-start: 4px !important;
              }
            `}
            steps={[
              {
                title: 'Name your connector',
                children: (
                  <>
                    <EuiText size="xs" color="subdued">
                      A unique name to identify this AWS connection in Elastic.
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiFormRow fullWidth>
                      <EuiFieldText
                        placeholder="e.g. prod-aws-us-east-1"
                        value={connectorName}
                        onChange={(e) => setConnectorName(e.target.value)}
                        fullWidth
                      />
                    </EuiFormRow>
                  </>
                ),
              },
              {
                title: 'Launch CloudFormation',
                children: (
                  <>
                    <EuiText size="xs" color="subdued">
                      Creates the IAM Role and trust policy in your AWS account automatically.
                      Once complete, copy the <strong>Role ARN</strong> from the Outputs tab.
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiButton iconType="launch" iconSide="left" size="s">
                      Launch CloudFormation
                    </EuiButton>
                  </>
                ),
              },
              {
                title: 'Copy credentials',
                children: (
                  <>
                    <EuiText size="xs" color="subdued">
                      Paste the Role ARN from the CloudFormation Outputs tab. The External ID is
                      pre-filled and used to secure the trust relationship.
                    </EuiText>
                    <EuiSpacer size="m" />
                    <EuiFormRow label="Role ARN" fullWidth>
                      <EuiFieldText
                        placeholder="arn:aws:iam::123456789012:role/ElasticRole"
                        value={roleArn}
                        onChange={(e) => {
                          setRoleArn(e.target.value);
                          setVerifyState('idle');
                        }}
                        fullWidth
                      />
                    </EuiFormRow>
                    <EuiSpacer size="s" />
                    <EuiFormRow
                      label="External ID"
                      helpText={
                        <EuiLink
                          href="https://www.elastic.co/docs/current/integrations/aws"
                          target="_blank"
                          external
                        >
                          Learn more about policy secrets
                        </EuiLink>
                      }
                      fullWidth
                    >
                      <EuiFieldPassword
                        value={GENERATED_EXTERNAL_ID}
                        readOnly
                        fullWidth
                        prepend={<EuiIcon type="lock" />}
                      />
                    </EuiFormRow>
                    <EuiSpacer size="m" />
                    <EuiButton
                      size="s"
                      isDisabled={!canVerify || verifyState === 'success'}
                      isLoading={verifyState === 'loading'}
                      color={verifyState === 'success' ? 'success' : 'primary'}
                      iconType={verifyState === 'success' ? 'checkInCircleFilled' : undefined}
                      onClick={handleVerify}
                    >
                      {verifyState === 'success' ? 'Connection verified' : 'Verify connection'}
                    </EuiButton>
                  </>
                ),
              },
            ]}
          />
        ) : (
          <>
            {EXISTING_CONNECTORS.length === 0 ? (
              <EuiPanel color="subdued" paddingSize="m" hasBorder>
                <EuiText size="s" color="subdued" textAlign="center">
                  No existing connectors found.{' '}
                  <EuiButtonEmpty size="s" onClick={() => setActiveTab('new')}>
                    Create a new one
                  </EuiButtonEmpty>
                </EuiText>
              </EuiPanel>
            ) : (
              <>
                <EuiText size="s" color="subdued">
                  <p>Select a connector to reuse its credentials for this integration.</p>
                </EuiText>
                <EuiSpacer size="s" />
                {EXISTING_CONNECTORS.map((c) => (
                  <EuiPanel key={c.name} hasBorder paddingSize="s" style={{ marginBottom: 8 }}>
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="lock" color="primary" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="s"><strong>{c.name}</strong></EuiText>
                        <EuiText size="xs" color="subdued">{c.arn}</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton size="s" fill>Select</EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                ))}
              </>
            )}
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={activeTab === 'new' && (!connectorName || !roleArn || verifyState !== 'success')}
            >
              Save connector
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

// ─── Elastic Agent setup flyout ───────────────────────────────────────────────

const AgentSetupFlyout: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <EuiFlyout
    onClose={onClose}
    aria-labelledby="agentSetupFlyoutTitle"
    ownFocus={false}
    flyoutMenuProps={{ title: 'Elastic Agent' }}
    css={css`
      inline-size: 36vw !important;
      animation-duration: 0s !important;
      transition-duration: 0s !important;
      ${flyoutPaddingCss}
    `}
  >
    <EuiFlyoutHeader hasBorder>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <IconBox><EuiIcon type="agentApp" size="l" color="primary" /></IconBox>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 0 }}>
          <EuiTitle size="s">
            <h2 id="agentSetupFlyoutTitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Install Elastic Agent</h2>
          </EuiTitle>
          <div style={{ height: 22, marginTop: 4, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <EuiText size="xs" color="subdued" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Required for {agentCount} AWS sources
            </EuiText>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutHeader>

    <EuiFlyoutBody>
      <EuiText size="s" color="subdued">
        <p>
          Install Elastic Agent on any host with outbound access to AWS API endpoints. It can run
          on-prem, on an EC2 instance, or even your local machine for testing.
        </p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiTitle size="xs"><h3>Quick install</h3></EuiTitle>
      <EuiSpacer size="s" />

      <EuiPanel color="subdued" paddingSize="s" hasBorder>
        <EuiAccordion
          id="agent-install-linux"
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiIcon type="logoLinux" size="m" />
              <EuiText size="s"><strong>Linux</strong></EuiText>
            </EuiFlexGroup>
          }
        >
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued"><p>Run as root on the host:</p></EuiText>
          <EuiSpacer size="xs" />
          <EuiPanel color="accent" paddingSize="s" css={css`font-family: monospace; font-size: 12px;`}>
            curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-latest-linux-x86_64.tar.gz<br />
            tar xzvf elastic-agent-latest-linux-x86_64.tar.gz<br />
            cd elastic-agent-latest-linux-x86_64<br />
            sudo ./elastic-agent install
          </EuiPanel>
        </EuiAccordion>
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel color="subdued" paddingSize="s" hasBorder>
        <EuiAccordion
          id="agent-install-mac"
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiIcon type="logoApple" size="m" />
              <EuiText size="s"><strong>macOS</strong></EuiText>
            </EuiFlexGroup>
          }
        >
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued"><p>Run in Terminal:</p></EuiText>
          <EuiSpacer size="xs" />
          <EuiPanel color="accent" paddingSize="s" css={css`font-family: monospace; font-size: 12px;`}>
            curl -L -O https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-latest-darwin-x86_64.tar.gz<br />
            tar xzvf elastic-agent-latest-darwin-x86_64.tar.gz<br />
            cd elastic-agent-latest-darwin-x86_64<br />
            sudo ./elastic-agent install
          </EuiPanel>
        </EuiAccordion>
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel color="subdued" paddingSize="s" hasBorder>
        <EuiAccordion
          id="agent-install-windows"
          buttonContent={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiIcon type="logoWindows" size="m" />
              <EuiText size="s"><strong>Windows</strong></EuiText>
            </EuiFlexGroup>
          }
        >
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued"><p>Run in PowerShell as Administrator:</p></EuiText>
          <EuiSpacer size="xs" />
          <EuiPanel color="accent" paddingSize="s" css={css`font-family: monospace; font-size: 12px;`}>
            Invoke-WebRequest -Uri https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-latest-windows-x86_64.zip -OutFile elastic-agent.zip<br />
            Expand-Archive elastic-agent.zip<br />
            cd elastic-agent<br />
            .\elastic-agent.exe install
          </EuiPanel>
        </EuiAccordion>
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiText size="s" color="subdued">
        Or manage agents at scale via{' '}
        <EuiLink href="/app/fleet" target="_blank" external>Fleet</EuiLink>.
      </EuiText>
    </EuiFlyoutBody>

    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill href="/app/fleet/agents" target="_blank" iconType="popout" iconSide="right">
            Open Fleet
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  </EuiFlyout>
);

// ─── Flyout padding CSS (shared) ──────────────────────────────────────────────

const flyoutPaddingCss = css`
  & .euiFlyoutHeader {
    padding-block: 24px !important;
    padding-inline: 24px !important;
  }
  & .euiFlyoutBody__overflowContent {
    padding-block: 24px !important;
    padding-inline: 48px !important;
  }
  & .euiFlyoutFooter {
    padding-block: 16px !important;
    padding-inline: 24px !important;
  }
`;

// ─── Services grid ────────────────────────────────────────────────────────────

type FilterType = 'all' | ServiceCategory;

const FILTER_OPTIONS: Array<{ id: FilterType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'Infrastructure', label: 'Infrastructure' },
  { id: 'Security', label: 'Security' },
  { id: 'Performance', label: 'Performance' },
  { id: 'Reliability', label: 'Reliability' },
  { id: 'Cost', label: 'Cost' },
  { id: 'Compliance', label: 'Compliance' },
  { id: 'AI Ops', label: 'AI Ops' },
  { id: 'Custom', label: 'Custom' },
];

interface AwsServicesGridProps {
  selectedService: AwsService | null;
  onServiceSelect: (service: AwsService) => void;
  onSetupAll: () => void;
}

const PAGE_SIZE = 12;

const AwsServicesGrid: React.FC<AwsServicesGridProps> = ({ selectedService, onServiceSelect, onSetupAll }) => {
  const { euiTheme } = useEuiTheme();
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(0);

  const filtered = AWS_SERVICES.filter((s) => filter === 'all' || s.category === filter);

  // On page 0 with filter 'all' the all-sources card occupies one slot, so show PAGE_SIZE - 1 service cards.
  const firstPageSize = filter === 'all' ? PAGE_SIZE - 1 : PAGE_SIZE;
  const pageCount =
    filter === 'all'
      ? Math.ceil((filtered.length - firstPageSize) / PAGE_SIZE) + 1
      : Math.ceil(filtered.length / PAGE_SIZE);
  const paginated =
    page === 0
      ? filtered.slice(0, firstPageSize)
      : filtered.slice(firstPageSize + (page - 1) * PAGE_SIZE, firstPageSize + page * PAGE_SIZE);

  const handleFilterChange = (id: string) => {
    setFilter(id as FilterType);
    setPage(0);
  };

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Filter AWS services by category"
            options={FILTER_OPTIONS}
            idSelected={filter}
            onChange={handleFilterChange}
            buttonSize="compressed"
            color="primary"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {filtered.length} sources
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: ${euiTheme.size.s};
        `}
      >
        {/* All-sources card — spans both columns, always at top */}
        {filter === 'all' && page === 0 && (
          <EuiPanel
            hasBorder
            paddingSize="s"
            onClick={onSetupAll}
            css={css`
              cursor: pointer;
              transition: border-color 0.15s ease, box-shadow 0.15s ease;
              border-color: ${euiTheme.colors.borderBasePlain};
              &:hover {
                border-color: ${euiTheme.colors.primary} !important;
                box-shadow: 0 0 0 1px ${euiTheme.colors.primary};
              }
            `}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <CardLogoIcon
                  src="https://raw.githubusercontent.com/elastic/integrations/main/packages/aws/img/logo_aws.svg"
                  alt="Amazon Web Services"
                  size={20}
                />
              </EuiFlexItem>
              <EuiFlexItem style={{ minWidth: 0 }}>
                <EuiText
                  size="s"
                  css={css`
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                >
                  Amazon Web Services
                </EuiText>
                <EuiText size="s" color="subdued" style={{ marginTop: 2 }}>
                  Default setup covering all AWS sources — metrics, logs, security & more.
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" css={css`white-space: nowrap;`}>All {AWS_SERVICES.length}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        )}
        {paginated.map((service) => {
          const isSelected = selectedService?.id === service.id;
          return (
            <EuiPanel
              key={service.id}
              hasBorder
              paddingSize="s"
              onClick={() => onServiceSelect(service)}
              css={css`
                cursor: pointer;
                transition: border-color 0.15s ease, box-shadow 0.15s ease;
                border-color: ${isSelected
                  ? `${euiTheme.colors.primary} !important`
                  : euiTheme.colors.borderBasePlain};
                box-shadow: ${isSelected ? `0 0 0 1px ${euiTheme.colors.primary}` : 'none'};
                &:hover {
                  border-color: ${euiTheme.colors.primary} !important;
                  box-shadow: 0 0 0 1px ${euiTheme.colors.primary};
                }
              `}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <CardLogoIcon src={service.logoUrl} alt={service.name} size={20} />
                </EuiFlexItem>
                <EuiFlexItem style={{ minWidth: 0 }}>
                  <EuiText
                    size="s"
                    css={css`
                      font-weight: 600;
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    `}
                  >
                    {service.name}
                  </EuiText>
                  <EuiText
                    size="s"
                    color="subdued"
                    css={css`
                      display: -webkit-box;
                      -webkit-line-clamp: 2;
                      -webkit-box-orient: vertical;
                      overflow: hidden;
                      margin-top: 2px;
                    `}
                  >
                    {service.useCase}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={CATEGORY_COLORS[service.category]}
                    css={css`white-space: nowrap;`}
                  >
                    {service.category}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          );
        })}
      </div>
      {pageCount > 1 && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPagination
                pageCount={pageCount}
                activePage={page}
                onPageClick={setPage}
                compressed
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

// ─── AWS details body ──────────────────────────────────────────────────────────

interface AwsDetailsBodyProps {
  selectedService: AwsService | null;
  onServiceSelect: (service: AwsService) => void;
  onSetupAll: () => void;
  onSetupCredentials: () => void;
  onSetupAgent: () => void;
}

const AWS_DASHBOARDS = [
  { icon: 'dashboardApp', label: 'AWS EC2 Overview' },
  { icon: 'dashboardApp', label: 'AWS S3 Access Logs' },
  { icon: 'dashboardApp', label: 'AWS CloudTrail Overview' },
  { icon: 'dashboardApp', label: 'AWS ELB Overview' },
  { icon: 'dashboardApp', label: 'AWS RDS Overview' },
  { icon: 'dashboardApp', label: 'AWS Lambda Overview' },
  { icon: 'dashboardApp', label: 'AWS VPC Flow Logs' },
  { icon: 'dashboardApp', label: 'AWS GuardDuty Findings' },
  { icon: 'dashboardApp', label: 'AWS CloudWatch Metrics' },
  { icon: 'dashboardApp', label: 'AWS Billing & Cost' },
  { icon: 'dashboardApp', label: 'AWS Security Hub Findings' },
  { icon: 'dashboardApp', label: 'AWS Network Firewall' },
];

const AWS_ALERTS = [
  { icon: 'bell', label: 'EC2 CPU utilization above 90%' },
  { icon: 'bell', label: 'RDS free storage below 10%' },
  { icon: 'bell', label: 'Lambda error rate spike' },
  { icon: 'bell', label: 'GuardDuty high-severity finding' },
  { icon: 'bell', label: 'S3 bucket public access enabled' },
  { icon: 'bell', label: 'CloudTrail: root account login' },
  { icon: 'bell', label: 'ELB 5xx error rate above 5%' },
  { icon: 'bell', label: 'DynamoDB throttle events detected' },
];

const agentCount = AWS_SERVICES.length - AWS_SERVICES.filter((s) => s.agentless).length;

const AwsDetailsBody: React.FC<AwsDetailsBodyProps> = ({ selectedService, onServiceSelect, onSetupAll, onSetupCredentials, onSetupAgent }) => (
  <>
    <EuiText>
      <p>
        Monitor infrastructure, security, and costs across <strong>40+ AWS services</strong> with
        pre-built dashboards and alerting rules. Some services connect directly via API — no agent
        needed.
      </p>
    </EuiText>


    <EuiHorizontalRule margin="l" />

    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>Available sources</h3>
        </EuiTitle>
        <EuiText size="s" color="subdued" css={css`margin-top: 2px;`}>
          <p>Select all sources or pick a specific one.</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />

    <AwsServicesGrid selectedService={selectedService} onServiceSelect={onServiceSelect} onSetupAll={onSetupAll} />

    <EuiHorizontalRule margin="l" />

    <EuiTitle size="xs">
      <h3>Requirements</h3>
    </EuiTitle>
    <EuiSpacer size="s" />

    <EuiPanel paddingSize="none" hasBorder>
      {/* Row 1 — AWS account */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
        css={css`padding: 10px 12px;`}>
        <EuiFlexItem grow={false}>
          <img
            src="https://raw.githubusercontent.com/elastic/integrations/main/packages/aws/img/logo_aws.svg"
            alt="AWS"
            style={{ width: 16, height: 16, objectFit: 'contain', display: 'block' }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>An AWS account</strong></EuiText>
          <EuiText size="xs" color="subdued">Free tier works for most services.</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      {/* Row 2 — Cloud Connector */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
        css={css`padding: 10px 12px;`}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="lock" size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>AWS credentials via Cloud Connector</strong></EuiText>
          <EuiText size="xs" color="subdued">
            Link your AWS account securely — CloudFormation handles the IAM Role automatically.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" iconType="lock" onClick={onSetupCredentials}>Set up</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      {/* Row 3 — Elastic Agent */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}
        css={css`padding: 10px 12px;`}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="agentApp" size="m" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s"><strong>Elastic Agent</strong></EuiText>
          <EuiText size="xs" color="subdued">
            Required for {agentCount} sources. Not needed for agentless sources.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" iconType="agentApp" onClick={onSetupAgent}>Set up</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </>
);

// ─── Main component ────────────────────────────────────────────────────────────

interface IntegrationDetailsFlyoutProps {
  tile: IntegrationTile;
  onClose: () => void;
  onDataConnected: () => void;
  onCloseAll: () => void;
}

export const IntegrationDetailsFlyout: React.FC<IntegrationDetailsFlyoutProps> = ({
  tile,
  onClose,
  onDataConnected,
  onCloseAll,
}) => {
  const [selectedService, setSelectedService] = useState<AwsService | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showCloudConnector, setShowCloudConnector] = useState(false);
  const [showAgentSetup, setShowAgentSetup] = useState(false);

  const isAws = tile.id === 'aws' || tile.id.startsWith('amazon_');
  const isKubernetes = tile.id === 'kubernetes';

  const hasChild = selectedService !== null || showInstall || showCloudConnector || showAgentSetup;

  const closeAllChildren = () => {
    setSelectedService(null);
    setShowInstall(false);
    setShowCloudConnector(false);
    setShowAgentSetup(false);
  };

  const handleSetup = () => {
    closeAllChildren();
    setShowInstall(true);
  };

  const handleSetupCredentials = () => {
    closeAllChildren();
    setShowCloudConnector(true);
  };

  const handleSetupAgent = () => {
    closeAllChildren();
    setShowAgentSetup(true);
  };

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="integrationDetailsFlyoutTitle"
      session="start"
      ownFocus={false}
      flyoutMenuProps={{ title: tile.name }}
      css={css`
        inline-size: ${hasChild ? '40vw' : '60vw'} !important;
        animation-duration: 0s !important;
        transition-duration: 0s !important;
        ${flyoutPaddingCss}
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <CardLogoIcon src={tile.logoUrl ?? ''} alt={`${tile.name} logo`} size={28} />
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 0 }}>
            <EuiTitle size="s">
              <h2 id="integrationDetailsFlyoutTitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tile.name}</h2>
            </EuiTitle>
            <div style={{ height: 22, marginTop: 4, overflow: 'hidden' }}>
            <EuiFlexGroup gutterSize="xs" responsive={false} style={{ flexWrap: 'nowrap' }}>
              {isAws && (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">v6.4.1</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="success">Basic</EuiBadge>
                  </EuiFlexItem>
                  {['Cloud', 'Observability', 'Security'].map((cat) => (
                    <EuiFlexItem grow={false} key={cat}>
                      <EuiBadge color="hollow">{cat}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </>
              )}
            </EuiFlexGroup>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isAws ? (
          <AwsDetailsBody
            selectedService={selectedService}
            onServiceSelect={(service) => {
              closeAllChildren();
              setSelectedService(service);
            }}
            onSetupAll={handleSetup}
            onSetupCredentials={handleSetupCredentials}
            onSetupAgent={handleSetupAgent}
          />
        ) : (
          <>
            <EuiText>
              <p>{tile.description}</p>
            </EuiText>
            <EuiHorizontalRule margin="l" />
            <EuiText color="subdued">
              <p>
                Full installation steps and dashboards for <strong>{tile.name}</strong> are
                available in the Kibana Integrations app.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={handleSetup}>
                  Add {tile.name}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="popout"
                  iconSide="right"
                  href={`/app/integrations/detail/${tile.logoDomain}/overview`}
                  target="_blank"
                >
                  View in Integrations
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutBody>

      {(isAws || isKubernetes) && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexStart" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>Close</EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}

      {/* ── Service detail child flyout — expands to the left natively ── */}
      {selectedService && !showInstall && (
        <EuiFlyout
          onClose={() => setSelectedService(null)}
          aria-labelledby="serviceDetailFlyoutTitle"
          ownFocus={false}
          flyoutMenuProps={{ title: selectedService.name }}
          css={css`
            inline-size: 36vw !important;
            animation-duration: 0s !important;
            transition-duration: 0s !important;
            ${flyoutPaddingCss}
          `}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <CardLogoIcon src={selectedService.logoUrl} alt={selectedService.name} size={28} />
              </EuiFlexItem>
              <EuiFlexItem style={{ minWidth: 0 }}>
                <EuiTitle size="s">
                  <h2 id="serviceDetailFlyoutTitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedService.name}</h2>
                </EuiTitle>
                <div style={{ height: 22, marginTop: 4, overflow: 'hidden' }}>
                <EuiFlexGroup gutterSize="xs" responsive={false} style={{ flexWrap: 'nowrap' }}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={CATEGORY_COLORS[selectedService.category]}>
                      {selectedService.category}
                    </EuiBadge>
                  </EuiFlexItem>
                  {selectedService.agentless && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="success">Agentless</EuiBadge>
                    </EuiFlexItem>
                  )}
                  {selectedService.badge && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{selectedService.badge}</EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <EuiText size="s" color="subdued">
              <p>{selectedService.useCase}</p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>{selectedService.description}</p>
            </EuiText>

            <EuiHorizontalRule margin="l" />

            <EuiTitle size="xs">
              <h3>Requirements</h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            {selectedService.agentless && (
              <>
                <EuiPanel color="success" paddingSize="s" hasBorder>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="checkInCircleFilled" color="success" size="m" />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>No Elastic Agent needed</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        This source connects directly to AWS via API — nothing to install.
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
                <EuiSpacer size="s" />
              </>
            )}

            <CloudConnectorGuide onSetup={handleSetupCredentials} />
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => setSelectedService(null)}>Back</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={handleSetup}>
                  Add {selectedService.name}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}

      {/* ── Cloud Connector setup child flyout ── */}
      {showCloudConnector && (
        <CloudConnectorSetupFlyout onClose={() => setShowCloudConnector(false)} />
      )}

      {/* ── Elastic Agent setup child flyout ── */}
      {showAgentSetup && (
        <AgentSetupFlyout onClose={() => setShowAgentSetup(false)} />
      )}

      {/* ── Full installation child flyouts ── */}
      {showInstall && isAws && (
        <AwsFlyout
          logoUrl={tile.logoUrl ?? ''}
          isChild
          onClose={() => setShowInstall(false)}
          onSeeMyData={() => {
            onDataConnected();
            setShowInstall(false);
            onCloseAll();
          }}
        />
      )}

      {showInstall && isKubernetes && (
        <KubernetesFlyout
          logoUrl={tile.logoUrl ?? ''}
          isChild
          onClose={() => setShowInstall(false)}
        />
      )}

      {showInstall && !isAws && !isKubernetes && (
        <EuiFlyout
          onClose={() => setShowInstall(false)}
          aria-labelledby="genericInstallFlyoutTitle"
          ownFocus={false}
          flyoutMenuProps={{ title: `Set up ${tile.name}` }}
          css={css`
            inline-size: 36vw !important;
            animation-duration: 0s !important;
            transition-duration: 0s !important;
            ${flyoutPaddingCss}
          `}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <CardLogoIcon src={tile.logoUrl ?? ''} alt={`${tile.name} logo`} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h2 id="genericInstallFlyoutTitle">Set up {tile.name}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText color="subdued">
              <p>
                Complete installation steps for <strong>{tile.name}</strong> are available in the
                Kibana Integrations app.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton
              fill
              iconType="popout"
              iconSide="right"
              href={`/app/integrations/detail/${tile.logoDomain}/overview`}
              target="_blank"
            >
              Open in Integrations
            </EuiButton>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => setShowInstall(false)}>Close</EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </EuiFlyout>
  );
};
