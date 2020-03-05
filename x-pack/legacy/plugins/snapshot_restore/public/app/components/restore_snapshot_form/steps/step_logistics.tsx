/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiComboBox,
} from '@elastic/eui';
import { Option } from '@elastic/eui/src/components/selectable/types';
import { RestoreSettings } from '../../../../../common/types';
import { documentationLinksService } from '../../../services/documentation';
import { useAppDependencies } from '../../../index';
import { StepProps } from './';

export const RestoreSnapshotStepLogistics: React.FunctionComponent<StepProps> = ({
  snapshotDetails,
  restoreSettings,
  updateRestoreSettings,
  errors,
}) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const {
    indices: snapshotIndices,
    includeGlobalState: snapshotIncludeGlobalState,
  } = snapshotDetails;

  const {
    indices: restoreIndices,
    renamePattern,
    renameReplacement,
    partial,
    includeGlobalState,
  } = restoreSettings;

  // States for choosing all indices, or a subset, including caching previously chosen subset list
  const [isAllIndices, setIsAllIndices] = useState<boolean>(!Boolean(restoreIndices));
  const [indicesOptions, setIndicesOptions] = useState<Option[]>(
    snapshotIndices.map(
      (index): Option => ({
        label: index,
        checked:
          isAllIndices ||
          // If indices is a string, we default to custom input mode, so we mark individual indices
          // as selected if user goes back to list mode
          typeof restoreIndices === 'string' ||
          (Array.isArray(restoreIndices) && restoreIndices.includes(index))
            ? 'on'
            : undefined,
      })
    )
  );

  // State for using selectable indices list or custom patterns
  // Users with more than 100 indices will probably want to use an index pattern to select
  // them instead, so we'll default to showing them the index pattern input.
  const [selectIndicesMode, setSelectIndicesMode] = useState<'list' | 'custom'>(
    typeof restoreIndices === 'string' || snapshotIndices.length > 100 ? 'custom' : 'list'
  );

  // State for custom patterns
  const [restoreIndexPatterns, setRestoreIndexPatterns] = useState<string[]>(
    typeof restoreIndices === 'string' ? restoreIndices.split(',') : []
  );

  // State for setting renaming indices patterns
  const [isRenamingIndices, setIsRenamingIndices] = useState<boolean>(
    Boolean(renamePattern || renameReplacement)
  );

  // Caching state for togglable settings
  const [cachedRestoreSettings, setCachedRestoreSettings] = useState<RestoreSettings>({
    indices: [...snapshotIndices],
    renamePattern: '',
    renameReplacement: '',
  });

  return (
    <div className="snapshotRestore__restoreForm__stepLogistics">
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogisticsTitle"
                defaultMessage="Restore details"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationLinksService.getRestoreDocUrl()}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.restoreForm.stepLogistics.docsButtonLabel"
              defaultMessage="Snapshot and Restore docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      {/* Indices */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.indicesTitle"
                defaultMessage="Indices"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepLogistics.indicesDescription"
            defaultMessage="Creates new indices if they don’t exist. Restores existing indices
              if they are closed and have the same number of shards as the snapshot index."
          />
        }
        fullWidth
      >
        <EuiFormRow hasEmptyLabelSpace fullWidth>
          <Fragment>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepLogistics.allIndicesLabel"
                  defaultMessage="All indices, including system indices"
                />
              }
              checked={isAllIndices}
              onChange={e => {
                const isChecked = e.target.checked;
                setIsAllIndices(isChecked);
                if (isChecked) {
                  updateRestoreSettings({ indices: undefined });
                } else {
                  updateRestoreSettings({
                    indices:
                      selectIndicesMode === 'custom'
                        ? restoreIndexPatterns.join(',')
                        : [...(cachedRestoreSettings.indices || [])],
                  });
                }
              }}
            />
            {isAllIndices ? null : (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiFormRow
                  className="snapshotRestore__restoreForm__stepLogistics__indicesFieldWrapper"
                  label={
                    selectIndicesMode === 'list' ? (
                      <EuiFlexGroup justifyContent="spaceBetween">
                        <EuiFlexItem grow={false}>
                          <FormattedMessage
                            id="xpack.snapshotRestore.restoreForm.stepLogistics.selectIndicesLabel"
                            defaultMessage="Select indices"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiLink
                            onClick={() => {
                              setSelectIndicesMode('custom');
                              updateRestoreSettings({ indices: restoreIndexPatterns.join(',') });
                            }}
                          >
                            <FormattedMessage
                              id="xpack.snapshotRestore.restoreForm.stepLogistics.indicesToggleCustomLink"
                              defaultMessage="Use index patterns"
                            />
                          </EuiLink>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ) : (
                      <EuiFlexGroup justifyContent="spaceBetween">
                        <EuiFlexItem grow={false}>
                          <FormattedMessage
                            id="xpack.snapshotRestore.restoreForm.stepLogistics.indicesPatternLabel"
                            defaultMessage="Index patterns"
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiLink
                            onClick={() => {
                              setSelectIndicesMode('list');
                              updateRestoreSettings({ indices: cachedRestoreSettings.indices });
                            }}
                          >
                            <FormattedMessage
                              id="xpack.snapshotRestore.restoreForm.stepLogistics.indicesToggleListLink"
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
                        id="xpack.snapshotRestore.restoreForm.stepLogistics.selectIndicesHelpText"
                        defaultMessage="{count} {count, plural, one {index} other {indices}} will be restored. {selectOrDeselectAllLink}"
                        values={{
                          count: restoreIndices && restoreIndices.length,
                          selectOrDeselectAllLink:
                            restoreIndices && restoreIndices.length > 0 ? (
                              <EuiLink
                                onClick={() => {
                                  // TODO: Change this to setIndicesOptions() when https://github.com/elastic/eui/issues/2071 is fixed
                                  indicesOptions.forEach((option: Option) => {
                                    option.checked = undefined;
                                  });
                                  updateRestoreSettings({ indices: [] });
                                  setCachedRestoreSettings({
                                    ...cachedRestoreSettings,
                                    indices: [],
                                  });
                                }}
                              >
                                <FormattedMessage
                                  id="xpack.snapshotRestore.restoreForm.stepLogistics.deselectAllIndicesLink"
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
                                  updateRestoreSettings({ indices: [...snapshotIndices] });
                                  setCachedRestoreSettings({
                                    ...cachedRestoreSettings,
                                    indices: [...snapshotIndices],
                                  });
                                }}
                              >
                                <FormattedMessage
                                  id="xpack.snapshotRestore.restoreForm.stepLogistics.selectAllIndicesLink"
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
                        updateRestoreSettings({ indices: [...newSelectedIndices] });
                        setCachedRestoreSettings({
                          ...cachedRestoreSettings,
                          indices: [...newSelectedIndices],
                        });
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
                      options={snapshotIndices.map(index => ({ label: index }))}
                      placeholder={i18n.translate(
                        'xpack.snapshotRestore.restoreForm.stepLogistics.indicesPatternPlaceholder',
                        {
                          defaultMessage: 'Enter index patterns, i.e. logstash-*',
                        }
                      )}
                      selectedOptions={restoreIndexPatterns.map(pattern => ({ label: pattern }))}
                      onCreateOption={(pattern: string) => {
                        if (!pattern.trim().length) {
                          return;
                        }
                        const newPatterns = [...restoreIndexPatterns, pattern];
                        setRestoreIndexPatterns(newPatterns);
                        updateRestoreSettings({
                          indices: newPatterns.join(','),
                        });
                      }}
                      onChange={(patterns: Array<{ label: string }>) => {
                        const newPatterns = patterns.map(({ label }) => label);
                        setRestoreIndexPatterns(newPatterns);
                        updateRestoreSettings({
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

      {/* Rename indices */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.renameIndicesTitle"
                defaultMessage="Rename indices"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepLogistics.renameIndicesDescription"
            defaultMessage="Renames indices on restore."
          />
        }
        fullWidth
      >
        <EuiFormRow hasEmptyLabelSpace fullWidth>
          <Fragment>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.snapshotRestore.restoreForm.stepLogistics.renameIndicesLabel"
                  defaultMessage="Rename indices"
                />
              }
              checked={isRenamingIndices}
              onChange={e => {
                const isChecked = e.target.checked;
                setIsRenamingIndices(isChecked);
                if (isChecked) {
                  updateRestoreSettings({
                    renamePattern: cachedRestoreSettings.renamePattern,
                    renameReplacement: cachedRestoreSettings.renameReplacement,
                  });
                } else {
                  updateRestoreSettings({
                    renamePattern: undefined,
                    renameReplacement: undefined,
                  });
                }
              }}
            />
            {!isRenamingIndices ? null : (
              <Fragment>
                <EuiSpacer size="m" />
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.snapshotRestore.restoreForm.stepLogistics.renamePatternLabel"
                          defaultMessage="Capture pattern"
                        />
                      }
                      helpText={
                        <FormattedMessage
                          id="xpack.snapshotRestore.restoreForm.stepLogistics.renamePatternHelpText"
                          defaultMessage="Use regular expressions"
                        />
                      }
                      isInvalid={Boolean(errors.renamePattern)}
                      error={errors.renamePattern}
                    >
                      <EuiFieldText
                        value={renamePattern}
                        placeholder="index_(.+)"
                        onChange={e => {
                          setCachedRestoreSettings({
                            ...cachedRestoreSettings,
                            renamePattern: e.target.value,
                          });
                          updateRestoreSettings({
                            renamePattern: e.target.value,
                          });
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.snapshotRestore.restoreForm.stepLogistics.renameReplacementLabel"
                          defaultMessage="Replacement pattern"
                        />
                      }
                      isInvalid={Boolean(errors.renameReplacement)}
                      error={errors.renameReplacement}
                    >
                      <EuiFieldText
                        value={renameReplacement}
                        placeholder="restored_index_$1"
                        onChange={e => {
                          setCachedRestoreSettings({
                            ...cachedRestoreSettings,
                            renameReplacement: e.target.value,
                          });
                          updateRestoreSettings({
                            renameReplacement: e.target.value,
                          });
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Fragment>
            )}
          </Fragment>
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Partial restore */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.partialTitle"
                defaultMessage="Partial restore"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepLogistics.partialDescription"
            defaultMessage="Allows restore of indices that don’t have snapshots of all shards."
          />
        }
        fullWidth
      >
        <EuiFormRow hasEmptyLabelSpace={true} fullWidth>
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.partialLabel"
                defaultMessage="Partial restore"
              />
            }
            checked={partial === undefined ? false : partial}
            onChange={e => updateRestoreSettings({ partial: e.target.checked })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {/* Include global state */}
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.includeGlobalStateTitle"
                defaultMessage="Restore global state"
              />
            </h3>
          </EuiTitle>
        }
        description={
          <FormattedMessage
            id="xpack.snapshotRestore.restoreForm.stepLogistics.includeGlobalStateDescription"
            defaultMessage="Restores templates that don’t currently exist in the cluster and overrides
              templates with the same name. Also restores persistent settings."
          />
        }
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace={true}
          fullWidth
          helpText={
            snapshotIncludeGlobalState ? null : (
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.includeGlobalStateDisabledDescription"
                defaultMessage="Not available for this snapshot."
              />
            )
          }
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.includeGlobalStateLabel"
                defaultMessage="Restore global state"
              />
            }
            checked={includeGlobalState === undefined ? false : includeGlobalState}
            onChange={e => updateRestoreSettings({ includeGlobalState: e.target.checked })}
            disabled={!snapshotIncludeGlobalState}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </div>
  );
};
