/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  EuiLink,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { serializePolicy } from '../../../../../common/lib';
import { useServices } from '../../../app_context';
import type { StepProps } from '.';
import { CollapsibleIndicesList } from '../../collapsible_lists';
import { PolicyFeatureStatesSummary } from '../../summaries';

export const PolicyStepReview: React.FunctionComponent<StepProps> = ({
  policy,
  updateCurrentStep,
}) => {
  const { i18n } = useServices();
  const { name, snapshotName, schedule, repository, config, retention } = policy;
  const { indices, includeGlobalState, featureStates, ignoreUnavailable, partial } = config || {
    indices: undefined,
    includeGlobalState: undefined,
    featureStates: [],
    ignoreUnavailable: undefined,
    partial: undefined,
  };

  const serializedPolicy = serializePolicy(policy);
  const { retention: serializedRetention } = serializedPolicy;

  const logisticsSectionTitle = i18n.translate(
    'xpack.snapshotRestore.policyForm.stepReview.summaryTab.sectionLogisticsTitle',
    { defaultMessage: 'Logistics' }
  );
  const snapshotSettingsSectionTitle = i18n.translate(
    'xpack.snapshotRestore.policyForm.stepReview.summaryTab.sectionSettingsTitle',
    { defaultMessage: 'Snapshot settings' }
  );
  const snapshotRetentionSectionTitle = i18n.translate(
    'xpack.snapshotRestore.policyForm.stepReview.retentionTab.sectionRetentionTitle',
    { defaultMessage: 'Snapshot retention' }
  );

  const EditStepTooltip = ({ step, sectionTitle }: { step: number; sectionTitle: string }) => {
    const editLabel = i18n.translate(
      'xpack.snapshotRestore.policyForm.stepReview.summaryTab.editStepTooltip',
      {
        defaultMessage: 'Edit {sectionTitle}',
        values: { sectionTitle },
      }
    );

    return (
      <EuiToolTip content={editLabel} disableScreenReaderOutput>
        <EuiLink aria-label={editLabel} onClick={() => updateCurrentStep(step)}>
          <EuiIcon type="pencil" aria-hidden />
        </EuiLink>
      </EuiToolTip>
    );
  };

  const renderSummaryTab = () => (
    <Fragment>
      {/* Logistics summary */}
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{logisticsSectionTitle}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EditStepTooltip step={1} sectionTitle={logisticsSectionTitle} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.nameLabel"
                defaultMessage="Policy name"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{name}</EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.snapshotNameLabel"
                defaultMessage="Snapshot name"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{snapshotName}</EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.repositoryLabel"
                defaultMessage="Repository"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{repository}</EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.scheduleLabel"
                defaultMessage="Schedule"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{schedule}</EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xxl" />

      {/* Snapshot settings summary */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{snapshotSettingsSectionTitle}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EditStepTooltip step={2} sectionTitle={snapshotSettingsSectionTitle} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.dataStreamsAndIndicesLabel"
                defaultMessage="Data streams and indices"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <CollapsibleIndicesList indices={indices} />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.ignoreUnavailableLabel"
                defaultMessage="Ignore unavailable indices"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {ignoreUnavailable ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.ignoreUnavailableTrueLabel"
                  defaultMessage="Yes"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.ignoreUnavailableFalseLabel"
                  defaultMessage="No"
                />
              )}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.includeGlobalStateLabel"
                defaultMessage="Include global state"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {includeGlobalState === false ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.includeGlobalStateFalseLabel"
                  defaultMessage="No"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.includeGlobalStateTrueLabel"
                  defaultMessage="Yes"
                />
              )}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
        <PolicyFeatureStatesSummary
          includeGlobalState={includeGlobalState}
          featureStates={featureStates}
        />
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.partialIndicesLabel"
                defaultMessage="Allow partial indices"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {partial ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.partialTrueLabel"
                  defaultMessage="Yes"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.partialFalseLabel"
                  defaultMessage="No"
                />
              )}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Retention summary */}
      {serializedRetention ? (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>{snapshotRetentionSectionTitle}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EditStepTooltip step={3} sectionTitle={snapshotRetentionSectionTitle} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />

          <EuiDescriptionList textStyle="reverse">
            {retention!.expireAfterValue && (
              <Fragment>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyForm.stepReview.retentionTab.expireAfterLabel"
                    defaultMessage="Delete after"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {retention!.expireAfterValue}
                  {retention!.expireAfterUnit}
                </EuiDescriptionListDescription>
              </Fragment>
            )}
            {retention!.minCount && (
              <Fragment>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyForm.stepReview.retentionTab.minCountLabel"
                    defaultMessage="Min count"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{retention!.minCount}</EuiDescriptionListDescription>
              </Fragment>
            )}
            {retention!.maxCount && (
              <Fragment>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyForm.stepReview.retentionTab.maxCountLabel"
                    defaultMessage="Max count"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{retention!.maxCount}</EuiDescriptionListDescription>
              </Fragment>
            )}
          </EuiDescriptionList>
        </Fragment>
      ) : null}
    </Fragment>
  );

  const renderRequestTab = () => {
    const endpoint = `PUT _slm/policy/${name}`;
    const json = JSON.stringify(serializedPolicy, null, 2);

    return (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiCodeBlock language="json" isCopyable>
          {`${endpoint}\n${json}`}
        </EuiCodeBlock>
      </Fragment>
    );
  };

  return (
    <Fragment>
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepReviewTitle"
            defaultMessage="Review policy"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiTabbedContent
        tabs={[
          {
            id: 'summary',
            name: i18n.translate('xpack.snapshotRestore.policyForm.stepReview.summaryTabTitle', {
              defaultMessage: 'Summary',
            }),
            content: renderSummaryTab(),
          },
          {
            id: 'json',
            name: i18n.translate('xpack.snapshotRestore.policyForm.stepReview.requestTabTitle', {
              defaultMessage: 'Request',
            }),
            content: renderRequestTab(),
          },
        ]}
      />
    </Fragment>
  );
};
