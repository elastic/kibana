/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SimpleModeDraft } from './simple_mode_draft';
import { PresetCards } from './preset_cards';
import { TitleWithIcon } from './title_with_icon';
import { DATA_STREAMS_WINDOW_OPTIONS, INDICES_PRESET_OPTIONS } from './preset_options';

interface SimpleModeSettingsProps {
  /** The defaults as edited, which the page keeps so it can offer to save them. */
  simpleDraft: SimpleModeDraft;
  canEdit: boolean;
  onEnableAdvancedMode: () => void;
  isUpdatingMode: boolean;
}

const NO_UNSAVED_CHANGES = i18n.translate('xpack.boost.simpleMode.noUnsavedChangesTooltip', {
  defaultMessage: 'No unsaved changes',
});

// EuiDescribedFormGroup aligns its columns on text baselines; top-align them instead.
const stretchColumnsCss = css({ alignItems: 'stretch' });

export const SimpleModeSettings = ({
  simpleDraft: { draft, isDirty, isSaving, setIndices, setDataStreamsWindow, discard, save },
  canEdit,
  onEnableAdvancedMode,
  isUpdatingMode,
}: SimpleModeSettingsProps) => {
  // Shown on the aria-disabled footer buttons; the wrapper stays mounted so saving keeps focus.
  const noChangesTooltip = isDirty ? undefined : NO_UNSAVED_CHANGES;

  if (!draft) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <EuiDescribedFormGroup
          ratio="half"
          css={stretchColumnsCss}
          fullWidth
          titleSize="xs"
          title={
            <h2>
              <TitleWithIcon iconType="table">
                {i18n.translate('xpack.boost.simpleMode.indicesTitle', {
                  defaultMessage: 'Indices',
                })}
              </TitleWithIcon>
            </h2>
          }
          description={
            <p>
              {i18n.translate('xpack.boost.simpleMode.indicesDescription', {
                defaultMessage:
                  'Applies to every index in this project. Increase boost for better query throughput as load grows, or decrease it to reduce provisioned resources at the cost of more variable query latency.',
              })}
            </p>
          }
        >
          <PresetCards
            name="indices"
            legend={i18n.translate('xpack.boost.simpleMode.indicesLegend', {
              defaultMessage: 'Default boost for indices',
            })}
            options={INDICES_PRESET_OPTIONS}
            selectedId={draft.indices}
            onChange={setIndices}
            disabled={!canEdit || isSaving}
          />
        </EuiDescribedFormGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiDescribedFormGroup
          ratio="half"
          css={stretchColumnsCss}
          fullWidth
          titleSize="xs"
          title={
            <h2>
              <TitleWithIcon iconType="productStreamsClassic">
                {i18n.translate('xpack.boost.simpleMode.dataStreamsTitle', {
                  defaultMessage: 'Data streams',
                })}
              </TitleWithIcon>
            </h2>
          }
          description={
            <p>
              {i18n.translate('xpack.boost.simpleMode.dataStreamsDescription', {
                defaultMessage:
                  'Applies to every data stream in this project. Sets how much recent time-series data is kept search-ready. Older data stays searchable, with more variable performance.',
              })}
            </p>
          }
        >
          <PresetCards
            name="dataStreams"
            legend={i18n.translate('xpack.boost.simpleMode.dataStreamsLegend', {
              defaultMessage: 'Default boosted window for data streams',
            })}
            options={DATA_STREAMS_WINDOW_OPTIONS}
            selectedId={draft.data_streams.window}
            onChange={setDataStreamsWindow}
            disabled={!canEdit || isSaving}
          />
        </EuiDescribedFormGroup>
      </EuiFlexItem>

      {canEdit && (
        <EuiFlexItem grow={false}>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
      )}

      {canEdit && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <p>
                  <FormattedMessage
                    id="xpack.boost.simpleMode.advancedModePrompt"
                    defaultMessage="Need to tune specific indices or data streams? {link}"
                    values={{
                      link: (
                        <EuiLink
                          onClick={onEnableAdvancedMode}
                          disabled={isUpdatingMode}
                          data-test-subj="enableAdvancedModeLink"
                        >
                          {i18n.translate('xpack.boost.simpleMode.advancedModeLink', {
                            defaultMessage: 'Try advanced mode',
                          })}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={noChangesTooltip}>
                    <EuiButtonEmpty
                      size="s"
                      onClick={discard}
                      isDisabled={!isDirty || isSaving}
                      hasAriaDisabled
                      data-test-subj="discardSimpleDefaults"
                    >
                      {i18n.translate('xpack.boost.simpleMode.discardButton', {
                        defaultMessage: 'Discard changes',
                      })}
                    </EuiButtonEmpty>
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={noChangesTooltip}>
                    <EuiButton
                      fill
                      size="s"
                      onClick={() => save()}
                      isLoading={isSaving}
                      isDisabled={!isDirty}
                      hasAriaDisabled
                      data-test-subj="saveSimpleDefaults"
                    >
                      {i18n.translate('xpack.boost.simpleMode.saveButton', {
                        defaultMessage: 'Save changes',
                      })}
                    </EuiButton>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
