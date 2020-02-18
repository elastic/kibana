/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';

import {
  EuiDescribedFormGroup,
  EuiTitle,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  EuiSwitch,
  EuiLink,
  EuiSelectable,
  EuiPanel,
  EuiComboBox,
  EuiToolTip,
} from '@elastic/eui';
import { Option } from '@elastic/eui/src/components/selectable/types';
import { SlmPolicyPayload, SnapshotConfig } from '../../../../../common/types';
import { documentationLinksService } from '../../../services/documentation';
import { useAppDependencies } from '../../../index';
import { StepProps } from './';

export const PolicyStepSettings: React.FunctionComponent<StepProps> = ({
  policy,
  indices,
  updatePolicy,
  errors,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { config = {}, isManagedPolicy } = policy;

  const updatePolicyConfig = (updatedFields: Partial<SlmPolicyPayload['config']>): void => {
    const newConfig = { ...config, ...updatedFields };
    updatePolicy({
      config: newConfig,
    });
  };

  // States for choosing all indices, or a subset, including caching previously chosen subset list
  const [isAllIndices, setIsAllIndices] = useState<boolean>(!Boolean(config.indices));
  const [indicesSelection, setIndicesSelection] = useState<SnapshotConfig['indices']>([...indices]);
  const [indicesOptions, setIndicesOptions] = useState<Option[]>(
    indices.map(
      (index): Option => ({
        label: index,
        checked:
          isAllIndices ||
          // If indices is a string, we default to custom input mode, so we mark individual indices
          // as selected if user goes back to list mode
          typeof config.indices === 'string' ||
          (Array.isArray(config.indices) && config.indices.includes(index))
            ? 'on'
            : undefined,
      })
    )
  );

  // State for using selectable indices list or custom patterns
  // Users with more than 100 indices will probably want to use an index pattern to select
  // them instead, so we'll default to showing them the index pattern input.
  const [selectIndicesMode, setSelectIndicesMode] = useState<'list' | 'custom'>(
    typeof config.indices === 'string' ||
      (Array.isArray(config.indices) && config.indices.length > 100)
      ? 'custom'
      : 'list'
  );

  // State for custom patterns
  const [indexPatterns, setIndexPatterns] = useState<string[]>(
    typeof config.indices === 'string' ? config.indices.split(',') : []
  );

  const renderIndicesField = () => {
    const indicesSwitch = (
      <EuiSwitch
        label={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepSettings.allIndicesLabel"
            defaultMessage="All indices, including system indices"
          />
        }
        checked={isAllIndices}
        disabled={isManagedPolicy}
        data-test-subj="allIndicesToggle"
        onChange={e => {
          const isChecked = e.target.checked;
          setIsAllIndices(isChecked);
          if (isChecked) {
            updatePolicyConfig({ indices: undefined });
          } else {
            updatePolicyConfig({
              indices:
                selectIndicesMode === 'custom'
                  ? indexPatterns.join(',')
                  : [...(indicesSelection || [])],
            });
          }
        }}
      />
    );

    return (
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepSettings.indicesTitle"
                defaultMessage="Indices"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.policyForm.stepSettings.indicesDescription"
            defaultMessage="Indices to back up."
          />
        }
        fullWidth
      >
        <EuiFormRow hasEmptyLabelSpace fullWidth>
          <Fragment>
            {isManagedPolicy ? (
              <EuiToolTip
                position="left"
                content={
                  <p>
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyForm.stepSettings.indicesTooltip"
                      defaultMessage="Cloud-managed policies require all indices."
                    />
                  </p>
                }
              >
                {indicesSwitch}
              </EuiToolTip>
            ) : (
              indicesSwitch
            )}
            {isAllIndices ? null : (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiFormRow
                  className="snapshotRestore__policyForm__stepSettings__indicesFieldWrapper"
                  label={
                    selectIndicesMode === 'list' ? (
                      <EuiFlexGroup justifyContent="spaceBetween">
                        <EuiFlexItem grow={false}>
                          <FormattedMessage
                            id="xpack.snapshotRestore.policyForm.stepSettings.selectIndicesLabel"
                            defaultMessage="Select indices"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiLink
                            onClick={() => {
                              setSelectIndicesMode('custom');
                              updatePolicyConfig({ indices: indexPatterns.join(',') });
                            }}
                          >
                            <FormattedMessage
                              id="xpack.snapshotRestore.policyForm.stepSettings.indicesToggleCustomLink"
                              defaultMessage="Use index patterns"
                            />
                          </EuiLink>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ) : (
                      <EuiFlexGroup justifyContent="spaceBetween">
                        <EuiFlexItem grow={false}>
                          <FormattedMessage
                            id="xpack.snapshotRestore.policyForm.stepSettings.indicesPatternLabel"
                            defaultMessage="Index patterns"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiLink
                            data-test-subj="selectIndicesLink"
                            onClick={() => {
                              setSelectIndicesMode('list');
                              updatePolicyConfig({ indices: indicesSelection });
                            }}
                          >
                            <FormattedMessage
                              id="xpack.snapshotRestore.policyForm.stepSettings.indicesToggleListLink"
                              defaultMessage="Select indices"
                            />
                          </EuiLink>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    )
                  }
                  helpText={
                    selectIndicesMode === 'list' ? (
                      <FormattedMessage
                        id="xpack.snapshotRestore.policyForm.stepSettings.selectIndicesHelpText"
                        defaultMessage="{count} {count, plural, one {index} other {indices}} will be backed up. {selectOrDeselectAllLink}"
                        values={{
                          count: config.indices && config.indices.length,
                          selectOrDeselectAllLink:
                            config.indices && config.indices.length > 0 ? (
                              <EuiLink
                                data-test-subj="deselectIndicesLink"
                                onClick={() => {
                                  // TODO: Change this to setIndicesOptions() when https://github.com/elastic/eui/issues/2071 is fixed
                                  indicesOptions.forEach((option: Option) => {
                                    option.checked = undefined;
                                  });
                                  updatePolicyConfig({ indices: [] });
                                  setIndicesSelection([]);
                                }}
                              >
                                <FormattedMessage
                                  id="xpack.snapshotRestore.policyForm.stepSettings.deselectAllIndicesLink"
                                  defaultMessage="Deselect all"
                                />
                              </EuiLink>
                            ) : (
                              <EuiLink
                                onClick={() => {
                                  // TODO: Change this to setIndicesOptions() when https://github.com/elastic/eui/issues/2071 is fixed
                                  indicesOptions.forEach((option: Option) => {
                                    option.checked = 'on';
                                  });
                                  updatePolicyConfig({ indices: [...indices] });
                                  setIndicesSelection([...indices]);
                                }}
                              >
                                <FormattedMessage
                                  id="xpack.snapshotRestore.policyForm.stepSettings.selectAllIndicesLink"
                                  defaultMessage="Select all"
                                />
                              </EuiLink>
                            ),
                        }}
                      />
                    ) : null
                  }
                  isInvalid={Boolean(errors.indices)}
                  error={errors.indices}
                >
                  {selectIndicesMode === 'list' ? (
                    <EuiSelectable
                      allowExclusions={false}
                      options={indicesOptions}
                      onChange={options => {
                        const newSelectedIndices: string[] = [];
                        options.forEach(({ label, checked }) => {
                          if (checked === 'on') {
                            newSelectedIndices.push(label);
                          }
                        });
                        setIndicesOptions(options);
                        updatePolicyConfig({ indices: newSelectedIndices });
                        setIndicesSelection(newSelectedIndices);
                      }}
                      searchable
                      height={300}
                    >
                      {(list, search) => (
                        <EuiPanel paddingSize="s" hasShadow={false}>
                          {search}
                          {list}
                        </EuiPanel>
                      )}
                    </EuiSelectable>
                  ) : (
                    <EuiComboBox
                      options={indices.map(index => ({ label: index }))}
                      placeholder={i18n.translate(
                        'xpack.snapshotRestore.policyForm.stepSettings.indicesPatternPlaceholder',
                        {
                          defaultMessage: 'Enter index patterns, i.e. logstash-*',
                        }
                      )}
                      selectedOptions={indexPatterns.map(pattern => ({ label: pattern }))}
                      onCreateOption={(pattern: string) => {
                        if (!pattern.trim().length) {
                          return;
                        }
                        const newPatterns = [...indexPatterns, pattern];
                        setIndexPatterns(newPatterns);
                        updatePolicyConfig({
                          indices: newPatterns.join(','),
                        });
                      }}
                      onChange={(patterns: Array<{ label: string }>) => {
                        const newPatterns = patterns.map(({ label }) => label);
                        setIndexPatterns(newPatterns);
                        updatePolicyConfig({
                          indices: newPatterns.join(','),
                        });
                      }}
                    />
                  )}
                </EuiFormRow>
              </Fragment>
            )}
          </Fragment>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  const renderIgnoreUnavailableField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.ignoreUnavailableDescriptionTitle"
              defaultMessage="Ignore unavailable indices"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.ignoreUnavailableDescription"
          defaultMessage="Ignores indices that are unavailable when taking the snapshot. Otherwise, the entire snapshot will fail."
        />
      }
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace fullWidth>
        <EuiSwitch
          data-test-subj="ignoreUnavailableIndicesToggle"
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.ignoreUnavailableLabel"
              defaultMessage="Ignore unavailable indices"
            />
          }
          checked={Boolean(config.ignoreUnavailable)}
          onChange={e => {
            updatePolicyConfig({
              ignoreUnavailable: e.target.checked,
            });
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderPartialField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.partialDescriptionTitle"
              defaultMessage="Allow partial indices"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.partialDescription"
          defaultMessage="Allows snapshots of indices with primary shards that are unavailable. Otherwise, the entire snapshot will fail."
        />
      }
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace fullWidth>
        <EuiSwitch
          data-test-subj="partialIndicesToggle"
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.partialIndicesToggleSwitch"
              defaultMessage="Allow partial indices"
            />
          }
          checked={Boolean(config.partial)}
          onChange={e => {
            updatePolicyConfig({
              partial: e.target.checked,
            });
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderIncludeGlobalStateField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.includeGlobalStateDescriptionTitle"
              defaultMessage="Include global state"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.includeGlobalStateDescription"
          defaultMessage="Stores the global state of the cluster as part of the snapshot."
        />
      }
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace fullWidth>
        <EuiSwitch
          data-test-subj="globalStateToggle"
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.policyIncludeGlobalStateLabel"
              defaultMessage="Include global state"
            />
          }
          checked={config.includeGlobalState === undefined || config.includeGlobalState}
          onChange={e => {
            updatePolicyConfig({
              includeGlobalState: e.target.checked,
            });
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
  return (
    <div className="snapshotRestore__policyForm__stepSettings">
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepSettingsTitle"
                defaultMessage="Snapshot settings"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationLinksService.getSnapshotDocUrl()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.docsButtonLabel"
              defaultMessage="Snapshot settings docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      {renderIndicesField()}
      {renderIgnoreUnavailableField()}
      {renderPartialField()}
      {renderIncludeGlobalStateField()}
    </div>
  );
};
