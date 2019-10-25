/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  EuiLink,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { serializePolicy } from '../../../../../common/lib';
import { useAppDependencies } from '../../../index';
import { StepProps } from './';

export const PolicyStepReview: React.FunctionComponent<StepProps> = ({
  policy,
  updateCurrentStep,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { name, snapshotName, schedule, repository, config, retention } = policy;
  const { indices, includeGlobalState, ignoreUnavailable, partial } = config || {
    indices: undefined,
    includeGlobalState: undefined,
    ignoreUnavailable: undefined,
    partial: undefined,
  };

  const [isShowingFullIndicesList, setIsShowingFullIndicesList] = useState<boolean>(false);
  const displayIndices = indices
    ? typeof indices === 'string'
      ? indices.split(',')
      : indices
    : undefined;
  const hiddenIndicesCount =
    displayIndices && displayIndices.length > 10 ? displayIndices.length - 10 : 0;

  const serializedPolicy = serializePolicy(policy);
  const { retention: serializedRetention } = serializedPolicy;

  const EditStepTooltip = ({ step }: { step: number }) => (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.editStepTooltip"
          defaultMessage="Edit"
        />
      }
    >
      <EuiLink onClick={() => updateCurrentStep(step)}>
        <EuiIcon
          type="pencil"
          aria-label={i18n.translate(
            'xpack.snapshotRestore.policyForm.stepReview.editIconAriaLabel',
            {
              defaultMessage: 'Edit step',
            }
          )}
        />
      </EuiLink>
    </EuiToolTip>
  );

  const renderSummaryTab = () => (
    <Fragment>
      {/* Logistics summary */}
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.sectionLogisticsTitle"
            defaultMessage="Logistics"
          />{' '}
          <EditStepTooltip step={1} />
        </h3>
      </EuiTitle>
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

      <EuiSpacer size="m" />

      {/* Snapshot settings summary */}
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.sectionSettingsTitle"
            defaultMessage="Snapshot settings"
          />{' '}
          <EditStepTooltip step={2} />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.indicesLabel"
                defaultMessage="Indices"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {displayIndices ? (
                <EuiText>
                  <ul>
                    {(isShowingFullIndicesList
                      ? displayIndices
                      : [...displayIndices].splice(0, 10)
                    ).map(index => (
                      <li key={index}>
                        <EuiTitle size="xs">
                          <span>{index}</span>
                        </EuiTitle>
                      </li>
                    ))}
                    {hiddenIndicesCount ? (
                      <li key="hiddenIndicesCount">
                        <EuiTitle size="xs">
                          {isShowingFullIndicesList ? (
                            <EuiLink onClick={() => setIsShowingFullIndicesList(false)}>
                              <FormattedMessage
                                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.indicesCollapseAllLink"
                                defaultMessage="Hide {count, plural, one {# index} other {# indices}}"
                                values={{ count: hiddenIndicesCount }}
                              />{' '}
                              <EuiIcon type="arrowUp" />
                            </EuiLink>
                          ) : (
                            <EuiLink onClick={() => setIsShowingFullIndicesList(true)}>
                              <FormattedMessage
                                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.indicesShowAllLink"
                                defaultMessage="Show {count} more {count, plural, one {index} other {indices}}"
                                values={{ count: hiddenIndicesCount }}
                              />{' '}
                              <EuiIcon type="arrowDown" />
                            </EuiLink>
                          )}
                        </EuiTitle>
                      </li>
                    ) : null}
                  </ul>
                </EuiText>
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.allIndicesValue"
                  defaultMessage="All indices"
                />
              )}
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
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.partialLabel"
                defaultMessage="Allow partial shards"
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
      </EuiFlexGroup>

      {/* Retention summary */}
      {serializedRetention ? (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.retentionTab.sectionRetentionTitle"
                defaultMessage="Snapshot retention"
              />{' '}
              <EditStepTooltip step={3} />
            </h3>
          </EuiTitle>
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
