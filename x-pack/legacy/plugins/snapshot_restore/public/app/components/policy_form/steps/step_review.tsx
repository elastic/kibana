/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiCodeEditor,
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
  EuiText,
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
  const { name, snapshotName, schedule, repository, config } = policy;
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

  const renderSummaryTab = () => (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.sectionLogisticsTitle"
            defaultMessage="Logistics"
          />{' '}
          <EuiToolTip
            content={
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.editStepTooltip"
                defaultMessage="Edit"
              />
            }
          >
            <EuiLink onClick={() => updateCurrentStep(1)}>
              <EuiIcon type="pencil" />
            </EuiLink>
          </EuiToolTip>
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
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.sectionSettingsTitle"
            defaultMessage="Snapshot settings"
          />{' '}
          <EuiToolTip
            content={
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepReview.summaryTab.editStepTooltip"
                defaultMessage="Edit"
              />
            }
          >
            <EuiLink onClick={() => updateCurrentStep(2)}>
              <EuiIcon type="pencil" />
            </EuiLink>
          </EuiToolTip>
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
    </Fragment>
  );

  const renderJsonTab = () => (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiCodeEditor
        mode="json"
        theme="textmate"
        isReadOnly
        setOptions={{ maxLines: Infinity }}
        value={JSON.stringify(serializePolicy(policy), null, 2)}
        editorProps={{ $blockScrolling: Infinity }}
        aria-label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepReview.jsonTab.jsonAriaLabel"
            defaultMessage="Policy to be saved"
          />
        }
      />
    </Fragment>
  );

  return (
    <Fragment>
      <EuiTitle>
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepReviewTitle"
            defaultMessage="Review policy details"
          />
        </h3>
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
            name: i18n.translate('xpack.snapshotRestore.policyForm.stepReview.jsonTabTitle', {
              defaultMessage: 'JSON',
            }),
            content: renderJsonTab(),
          },
        ]}
      />
    </Fragment>
  );
};
