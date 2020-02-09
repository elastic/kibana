/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import {
  EuiCodeEditor,
  EuiFlexGrid,
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
import { serializeRestoreSettings } from '../../../../../common/lib';
import { useAppDependencies } from '../../../index';
import { StepProps } from './';

export const RestoreSnapshotStepReview: React.FunctionComponent<StepProps> = ({
  restoreSettings,
  updateCurrentStep,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const {
    indices: restoreIndices,
    renamePattern,
    renameReplacement,
    partial,
    includeGlobalState,
    ignoreIndexSettings,
  } = restoreSettings;

  const serializedRestoreSettings = serializeRestoreSettings(restoreSettings);
  const { index_settings: serializedIndexSettings } = serializedRestoreSettings;

  const [isShowingFullIndicesList, setIsShowingFullIndicesList] = useState<boolean>(false);
  const displayIndices = restoreIndices
    ? typeof restoreIndices === 'string'
      ? restoreIndices.split(',')
      : restoreIndices
    : undefined;
  const hiddenIndicesCount =
    displayIndices && displayIndices.length > 10 ? displayIndices.length - 10 : 0;

  const renderSummaryTab = () => (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.sectionLogisticsTitle"
            defaultMessage="Logistics"
          />{' '}
          <EuiToolTip
            content={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.editStepTooltip"
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
                id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.indicesLabel"
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
                                id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.indicesCollapseAllLink"
                                defaultMessage="Hide {count, plural, one {# index} other {# indices}}"
                                values={{ count: hiddenIndicesCount }}
                              />{' '}
                              <EuiIcon type="arrowUp" />
                            </EuiLink>
                          ) : (
                            <EuiLink onClick={() => setIsShowingFullIndicesList(true)}>
                              <FormattedMessage
                                id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.indicesShowAllLink"
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
                  id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.allIndicesValue"
                  defaultMessage="All indices"
                />
              )}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>

      {renamePattern || renameReplacement ? (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.sectionRenameTitle"
                defaultMessage="Rename indices"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            {renamePattern ? (
              <EuiFlexItem>
                <EuiDescriptionList textStyle="reverse">
                  <EuiDescriptionListTitle>
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.renamePatternLabel"
                      defaultMessage="Capture pattern"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>{renamePattern}</EuiDescriptionListDescription>
                </EuiDescriptionList>
              </EuiFlexItem>
            ) : null}
            {renameReplacement ? (
              <EuiFlexItem>
                <EuiDescriptionList textStyle="reverse">
                  <EuiDescriptionListTitle>
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.renameReplacementLabel"
                      defaultMessage="Replacement pattern"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>{renameReplacement}</EuiDescriptionListDescription>
                </EuiDescriptionList>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </Fragment>
      ) : null}

      {partial !== undefined || includeGlobalState !== undefined ? (
        <EuiFlexGroup>
          {partial !== undefined ? (
            <EuiFlexItem>
              <EuiDescriptionList textStyle="reverse">
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.partialLabel"
                    defaultMessage="Partial restore"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {partial ? (
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.partialTrueValue"
                      defaultMessage="Yes"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.partialFalseValue"
                      defaultMessage="No"
                    />
                  )}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          ) : null}
          {includeGlobalState !== undefined ? (
            <EuiFlexItem>
              <EuiDescriptionList textStyle="reverse">
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.includeGlobalStateLabel"
                    defaultMessage="Restore global state"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {includeGlobalState ? (
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.includeGlobalStateTrueValue"
                      defaultMessage="Yes"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.includeGlobalStateFalseValue"
                      defaultMessage="No"
                    />
                  )}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ) : null}

      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.sectionSettingsTitle"
            defaultMessage="Index settings"
          />{' '}
          <EuiToolTip
            content={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.editStepTooltip"
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

      {serializedIndexSettings || ignoreIndexSettings ? (
        <EuiFlexGroup>
          {serializedIndexSettings ? (
            <EuiFlexItem style={{ maxWidth: '50%' }}>
              <EuiDescriptionList textStyle="reverse">
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.indexSettingsLabel"
                    defaultMessage="Modify"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <EuiFlexGrid columns={2} gutterSize="none">
                    {Object.entries(serializedIndexSettings).map(([setting, value]) => (
                      <Fragment key={setting}>
                        <EuiFlexItem>
                          <EuiText size="s">
                            <strong>{setting}</strong>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s">
                            <span> {value}</span>
                          </EuiText>
                        </EuiFlexItem>
                      </Fragment>
                    ))}
                  </EuiFlexGrid>
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          ) : null}
          {ignoreIndexSettings ? (
            <EuiFlexItem>
              <EuiDescriptionList textStyle="reverse">
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.ignoreIndexSettingsLabel"
                    defaultMessage="Reset"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <EuiText>
                    <ul>
                      {ignoreIndexSettings.map(setting => (
                        <li key={setting}>
                          <EuiTitle size="xs">
                            <span>{setting}</span>
                          </EuiTitle>
                        </li>
                      ))}
                    </ul>
                  </EuiText>
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ) : (
        <FormattedMessage
          id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.noSettingsValue"
          defaultMessage="No index setting modifications"
        />
      )}
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
        value={JSON.stringify(serializedRestoreSettings, null, 2)}
        editorProps={{ $blockScrolling: Infinity }}
        aria-label={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepReview.jsonTab.jsonAriaLabel"
            defaultMessage="Restore settings to be executed"
          />
        }
      />
    </Fragment>
  );

  return (
    <Fragment>
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepReviewTitle"
            defaultMessage="Review restore details"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiTabbedContent
        tabs={[
          {
            id: 'summary',
            name: i18n.translate('xpack.snapshotRestore.restoreForm.stepReview.summaryTabTitle', {
              defaultMessage: 'Summary',
            }),
            content: renderSummaryTab(),
          },
          {
            id: 'json',
            name: i18n.translate('xpack.snapshotRestore.restoreForm.stepReview.jsonTabTitle', {
              defaultMessage: 'JSON',
            }),
            content: renderJsonTab(),
          },
        ]}
      />
    </Fragment>
  );
};
