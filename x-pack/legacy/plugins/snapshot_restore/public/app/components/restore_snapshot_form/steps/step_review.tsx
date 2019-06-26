/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
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
} from '@elastic/eui';
import { serializeRestoreSettings } from '../../../../../common/lib';
import { useAppDependencies } from '../../../index';
import { StepProps } from './';

export const RestoreSnapshotStepReview: React.FunctionComponent<StepProps> = ({
  restoreSettings,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const {
    indices,
    renamePattern,
    renameReplacement,
    partial,
    includeGlobalState,
    ignoreIndexSettings,
  } = restoreSettings;

  const serializedRestoreSettings = serializeRestoreSettings(restoreSettings);
  const { index_settings: serializedIndexSettings } = serializedRestoreSettings;

  const renderSummaryTab = () => (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.sectionLogisticsTitle"
            defaultMessage="Logistics"
          />
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
              {indices ? (
                <EuiText>
                  <ul>
                    {indices.map(index => (
                      <li key={index}>
                        <EuiTitle size="xs">
                          <span>{index}</span>
                        </EuiTitle>
                      </li>
                    ))}
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
        <EuiFlexGroup>
          {renamePattern ? (
            <EuiFlexItem>
              <EuiDescriptionList textStyle="reverse">
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.restoreForm.stepReview.summaryTab.renamePatternLabel"
                    defaultMessage="Rename indices capture pattern"
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
                    defaultMessage="Rename indices replacement pattern"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{renameReplacement}</EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
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
                    defaultMessage="Include global state"
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
          />
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
                    defaultMessage="Modify index settings"
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
                    defaultMessage="Reset index settings"
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
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepReviewTitle"
            defaultMessage="Review restore details"
          />
        </h3>
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
