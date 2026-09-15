/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiToolTip,
  useGeneratedHtmlId,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EisDisplayOptions } from '../../utils/eis_utils';
import { DisplayOptionRow } from './display_option_row';
import { DisplayOptionsTour } from './display_options_tour';

const popoverPanelStyles = ({ euiTheme }: UseEuiTheme) => ({
  minWidth: euiTheme.base * 25,
});

interface DisplayOptionsProps {
  value: EisDisplayOptions;
  onApply: (next: EisDisplayOptions) => void;
  onOpen?: () => void;
  isTourOpen: boolean;
  onDismissTour: () => void;
}

interface DisplayOptionRowConfig {
  field: keyof EisDisplayOptions;
  label: string;
  helpText: string;
  hideId: string;
  showId: string;
  testSubj: string;
}

const DISPLAY_OPTION_ROWS: DisplayOptionRowConfig[] = [
  {
    field: 'showOutsideRegionPreferences',
    label: i18n.translate(
      'xpack.searchInferenceEndpoints.eisModelsPage.displayOptions.outsideRegionPreferencesLabel',
      { defaultMessage: 'Models outside region preferences' }
    ),
    helpText: i18n.translate(
      'xpack.searchInferenceEndpoints.eisModelsPage.displayOptions.outsideRegionPreferencesDescription',
      {
        defaultMessage:
          'Models unavailable within your region preferences are not available for use.',
      }
    ),
    hideId: 'eisDisplayOptionsOutsideRegionPreferencesHide',
    showId: 'eisDisplayOptionsOutsideRegionPreferencesShow',
    testSubj: 'eisDisplayOptionsOutsideRegionPreferences',
  },
  {
    field: 'showDeprecatedModels',
    label: i18n.translate(
      'xpack.searchInferenceEndpoints.eisModelsPage.displayOptions.deprecatedModelsLabel',
      { defaultMessage: 'Deprecated models' }
    ),
    helpText: i18n.translate(
      'xpack.searchInferenceEndpoints.eisModelsPage.displayOptions.deprecatedModelsDescription',
      {
        defaultMessage: 'Models past their end-of-life date are not available for use.',
      }
    ),
    hideId: 'eisDisplayOptionsDeprecatedModelsHide',
    showId: 'eisDisplayOptionsDeprecatedModelsShow',
    testSubj: 'eisDisplayOptionsDeprecatedModels',
  },
  {
    field: 'showPreviewModels',
    label: i18n.translate(
      'xpack.searchInferenceEndpoints.eisModelsPage.displayOptions.previewModelsLabel',
      { defaultMessage: 'Preview models' }
    ),
    helpText: i18n.translate(
      'xpack.searchInferenceEndpoints.eisModelsPage.displayOptions.previewModelsDescription',
      { defaultMessage: 'Models in preview are not recommended for production use.' }
    ),
    hideId: 'eisDisplayOptionsPreviewModelsHide',
    showId: 'eisDisplayOptionsPreviewModelsShow',
    testSubj: 'eisDisplayOptionsPreviewModels',
  },
];

export const DisplayOptions = ({
  value,
  onApply,
  onOpen,
  isTourOpen,
  onDismissTour,
}: DisplayOptionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const popoverTitleId = useGeneratedHtmlId();

  const isOutsideDirty = draft.showOutsideRegionPreferences !== value.showOutsideRegionPreferences;
  const isDeprecatedDirty = draft.showDeprecatedModels !== value.showDeprecatedModels;
  const isPreviewDirty = draft.showPreviewModels !== value.showPreviewModels;
  const isStatusDirty = isDeprecatedDirty || isPreviewDirty;
  const isDirty = isOutsideDirty || isStatusDirty;

  const closePopover = () => {
    setIsOpen(false);
  };

  const onButtonClick = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    onOpen?.();
    setDraft(value);
    setIsOpen(true);
  };

  return (
    <EuiPopover
      id="eisDisplayOptions"
      aria-labelledby={popoverTitleId}
      button={
        <DisplayOptionsTour isOpen={isTourOpen} onDismiss={onDismissTour}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.searchInferenceEndpoints.eisModelsPage.displayOptionsButtonTooltip',
              { defaultMessage: 'Display options' }
            )}
            disableScreenReaderOutput
            data-test-subj="eisDisplayOptionsTooltip"
          >
            <EuiButtonIcon
              iconType="controls"
              aria-label={i18n.translate(
                'xpack.searchInferenceEndpoints.eisModelsPage.displayOptionsButtonAriaLabel',
                { defaultMessage: 'Display options' }
              )}
              onClick={onButtonClick}
              display={isOpen ? 'fill' : 'base'}
              size="m"
              color="text"
              data-test-subj="eisDisplayOptionsButton"
            />
          </EuiToolTip>
        </DisplayOptionsTour>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      panelPaddingSize="m"
      panelProps={{ css: popoverPanelStyles }}
    >
      <EuiPopoverTitle paddingSize="m" id={popoverTitleId}>
        {i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.displayOptionsTitle', {
          defaultMessage: 'Model display options',
        })}
      </EuiPopoverTitle>
      <EuiFlexGroup direction="column" gutterSize="m">
        {DISPLAY_OPTION_ROWS.map(({ field, label, helpText, hideId, showId, testSubj }) => (
          <EuiFlexItem key={field}>
            <DisplayOptionRow
              label={label}
              helpText={helpText}
              hideId={hideId}
              showId={showId}
              isShown={draft[field]}
              onChange={(id) => {
                setDraft((prev) => ({
                  ...prev,
                  [field]: id === showId,
                }));
              }}
              testSubj={testSubj}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiPopoverFooter paddingSize="m">
        <EuiButton
          fill
          fullWidth
          isDisabled={!isDirty}
          onClick={() => {
            onApply(draft);
            setIsOpen(false);
          }}
          data-test-subj="eisDisplayOptionsApplyButton"
        >
          {i18n.translate(
            'xpack.searchInferenceEndpoints.eisModelsPage.displayOptions.applyButtonLabel',
            { defaultMessage: 'Apply' }
          )}
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
