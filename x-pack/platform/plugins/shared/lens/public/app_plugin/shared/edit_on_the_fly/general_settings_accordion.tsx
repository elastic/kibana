/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import type { CoreStart } from '@kbn/core/public';
import {
  EuiAccordion,
  EuiTitle,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiFieldText,
  EuiTextArea,
  EuiButtonEmpty,
  EuiSpacer,
  EuiSuperDatePicker,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  apiPublishesTimeRange,
  getDescription,
  getInheritedViewMode,
  getTitle,
} from '@kbn/presentation-publishing';

interface TimePickerQuickRange {
  from: string;
  to: string;
  display: string;
}

/**
 * Narrow API surface consumed from the dashboard panel child (Lens embeddable),
 * aligned with CustomizePanelEditor in the embeddable plugin.
 */
export interface GeneralPanelSettingsApi {
  readonly hideTitle$?: {
    readonly value?: boolean | undefined;
  };
  readonly setHideTitle?: (hide: boolean | undefined) => void;

  readonly title$?: {
    readonly value?: string | undefined;
  };
  readonly defaultTitle$?: {
    readonly value?: string | undefined;
  };
  readonly setTitle?: (title: string | undefined) => void;

  readonly description$?: {
    readonly value?: string | undefined;
  };
  readonly defaultDescription$?: {
    readonly value?: string | undefined;
  };
  readonly setDescription?: (description: string | undefined) => void;

  readonly hideBorder$?: {
    readonly value?: boolean | undefined;
  };
  readonly setHideBorder?: (hide: boolean | undefined) => void;

  readonly timeRange$?: {
    readonly value?: { from: string; to: string } | undefined;
  };
  readonly parentApi?: {
    timeRange$?: { readonly value?: { from: string; to: string } | undefined };
  };
  readonly setTimeRange?: (range: { from: string; to: string } | undefined) => void;

  readonly isCompatibleWithUnifiedSearch?: () => boolean;
}

export interface GeneralSettingsAccordionHandle {
  save: () => void;
  hasChanges: () => boolean;
}

export interface GeneralSettingsAccordionProps {
  panelApi: GeneralPanelSettingsApi;
  coreStart: CoreStart;
  /** Open state mirrors other Lens flyout accordions */
  isAccordionOpen: boolean;
  /** EuiAccordion toggle; next open state matches other Lens flyout accordions */
  onAccordionToggle: (isOpenNext: boolean) => void;
  /** Called whenever the dirty state of the general settings changes */
  onHasChangesChange?: (hasChanges: boolean) => void;
}

export const GeneralSettingsAccordion = forwardRef<
  GeneralSettingsAccordionHandle,
  GeneralSettingsAccordionProps
>(function GeneralSettingsAccordion(props, ref) {
  const {
    panelApi: api,
    coreStart,
    isAccordionOpen,
    onAccordionToggle,
    onHasChangesChange,
  } = props;
  const publishingApi = api as Parameters<typeof getInheritedViewMode>[0];
  const editMode = getInheritedViewMode(publishingApi) === 'edit';

  const [hideTitle, setHideTitle] = useState(api.hideTitle$?.value);
  const [panelTitle, setPanelTitle] = useState(() =>
    getTitle(api as Parameters<typeof getTitle>[0])
  );
  const [panelDescription, setPanelDescription] = useState(() =>
    getDescription(api as Parameters<typeof getDescription>[0])
  );
  const [timeRange, setTimeRange] = useState(
    api.timeRange$?.value ?? api.parentApi?.timeRange$?.value
  );
  const [isPanelBorderless, setIsPanelBorderless] = useState(api.hideBorder$?.value);

  const [hasOwnTimeRange, setHasOwnTimeRange] = useState<boolean>(Boolean(api.timeRange$?.value));

  /** Resync draft state when navigating between panels without remount */
  useEffect(() => {
    setHideTitle(api.hideTitle$?.value);
    setPanelTitle(getTitle(api as Parameters<typeof getTitle>[0]));
    setPanelDescription(getDescription(api as Parameters<typeof getDescription>[0]));
    setTimeRange(api.timeRange$?.value ?? api.parentApi?.timeRange$?.value);
    setIsPanelBorderless(api.hideBorder$?.value);
    setHasOwnTimeRange(Boolean(api.timeRange$?.value));
  }, [api]);

  const commonlyUsedRangesForDatePicker = useMemo(() => {
    const commonlyUsedRanges = coreStart.uiSettings.get<TimePickerQuickRange[]>(
      UI_SETTINGS.TIMEPICKER_QUICK_RANGES
    );
    if (!commonlyUsedRanges) return [];
    return commonlyUsedRanges.map(
      ({ from, to, display }: { from: string; to: string; display: string }) => ({
        start: from,
        end: to,
        label: display,
      })
    );
  }, [coreStart.uiSettings]);

  const dateFormat = useMemo(
    () => coreStart.uiSettings.get<string>(UI_SETTINGS.DATE_FORMAT),
    [coreStart.uiSettings]
  );

  const hasChanges = useCallback(() => {
    const currentTitle = getTitle(api as Parameters<typeof getTitle>[0]);
    if (panelTitle !== currentTitle) return true;
    if (hideTitle !== api.hideTitle$?.value) return true;
    if (isPanelBorderless !== api.hideBorder$?.value) return true;
    const currentDescription = getDescription(api as Parameters<typeof getDescription>[0]);
    if (panelDescription !== currentDescription) return true;
    const newTimeRange = hasOwnTimeRange ? timeRange : undefined;
    if (newTimeRange !== api.timeRange$?.value) return true;
    return false;
  }, [api, panelTitle, hideTitle, isPanelBorderless, panelDescription, hasOwnTimeRange, timeRange]);

  const save = useCallback(() => {
    if (panelTitle === api?.defaultTitle$?.value) {
      api.setTitle?.(undefined);
    } else if (panelTitle !== api.title$?.value) {
      api.setTitle?.(panelTitle);
    }
    if (hideTitle !== api.hideTitle$?.value) api.setHideTitle?.(hideTitle);
    if (isPanelBorderless !== api.hideBorder$?.value) api.setHideBorder?.(isPanelBorderless);
    if (panelDescription !== api.description$?.value) api.setDescription?.(panelDescription);

    const newTimeRange = hasOwnTimeRange ? timeRange : undefined;
    if (newTimeRange !== api.timeRange$?.value) {
      api.setTimeRange?.(newTimeRange);
    }
  }, [api, panelTitle, hideTitle, isPanelBorderless, panelDescription, hasOwnTimeRange, timeRange]);

  useImperativeHandle(ref, () => ({ save, hasChanges }), [save, hasChanges]);

  const dirty = hasChanges();
  useEffect(() => {
    onHasChangesChange?.(dirty);
  }, [dirty, onHasChangesChange]);

  const renderCustomTitleComponent = () => {
    if (!editMode) return null;

    return (
      <div data-test-subj="lensGeneralSettingsEmbeddableTitleComponent">
        <EuiFormRow>
          <EuiSwitch
            compressed
            checked={!hideTitle}
            data-test-subj="lensGeneralSettingsPanelHideTitleSwitch"
            id="lensInlineGeneralSettingsHideTitle"
            label={
              <FormattedMessage
                defaultMessage="Show title"
                id="xpack.lens.inlineGeneralSettings.showTitle"
              />
            }
            onChange={(e) => setHideTitle(!e.target.checked)}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.lens.inlineGeneralSettings.panelTitleLabel"
              defaultMessage="Title"
            />
          }
          labelAppend={
            api?.defaultTitle$?.value ? (
              <EuiButtonEmpty
                size="xs"
                data-test-subj="lensGeneralSettingsResetTitleButton"
                onClick={() => setPanelTitle(api.defaultTitle$?.value)}
                disabled={hideTitle || panelTitle === api?.defaultTitle$?.value}
                aria-label={i18n.translate('xpack.lens.inlineGeneralSettings.resetTitleAria', {
                  defaultMessage: 'Reset title to default',
                })}
              >
                <FormattedMessage
                  id="xpack.lens.inlineGeneralSettings.resetTitle"
                  defaultMessage="Reset to default"
                />
              </EuiButtonEmpty>
            ) : undefined
          }
        >
          <EuiFieldText
            compressed
            id="lensInlineGeneralSettingsPanelTitle"
            data-test-subj="lensGeneralSettingsPanelTitleInput"
            name="title"
            type="text"
            disabled={hideTitle}
            value={panelTitle ?? ''}
            onChange={(e) => setPanelTitle(e.target.value)}
            aria-label={i18n.translate('xpack.lens.inlineGeneralSettings.titleInputAria', {
              defaultMessage: 'Enter a custom title for your panel',
            })}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.lens.inlineGeneralSettings.descriptionLabel"
              defaultMessage="Description"
            />
          }
          labelAppend={
            api.defaultDescription$?.value ? (
              <EuiButtonEmpty
                size="xs"
                data-test-subj="lensGeneralSettingsResetDescriptionButton"
                onClick={() => setPanelDescription(api.defaultDescription$?.value)}
                disabled={api.defaultDescription$?.value === panelDescription}
                aria-label={i18n.translate('xpack.lens.inlineGeneralSettings.resetDescAria', {
                  defaultMessage: 'Reset description to default',
                })}
              >
                <FormattedMessage
                  id="xpack.lens.inlineGeneralSettings.resetDescription"
                  defaultMessage="Reset to default"
                />
              </EuiButtonEmpty>
            ) : undefined
          }
        >
          <EuiTextArea
            compressed
            id="lensInlineGeneralSettingsPanelDescription"
            data-test-subj="lensGeneralSettingsPanelDescriptionInput"
            disabled={!editMode}
            name="description"
            placeholder={i18n.translate('xpack.lens.inlineGeneralSettings.descriptionPlaceholder', {
              defaultMessage: 'Optional',
            })}
            value={panelDescription ?? ''}
            onChange={(e) => setPanelDescription(e.target.value)}
            aria-label={i18n.translate('xpack.lens.inlineGeneralSettings.descriptionInputAria', {
              defaultMessage: 'Enter a custom description for your panel',
            })}
          />
        </EuiFormRow>
      </div>
    );
  };

  const renderCustomTimeRangeComponent = () => {
    if (
      !apiPublishesTimeRange(api as Parameters<typeof apiPublishesTimeRange>[0]) ||
      !(
        (
          api as unknown as {
            isCompatibleWithUnifiedSearch?: () => boolean;
          }
        ).isCompatibleWithUnifiedSearch?.() ?? true
      )
    ) {
      return null;
    }

    return (
      <>
        <EuiFormRow>
          <EuiSwitch
            compressed
            checked={hasOwnTimeRange}
            data-test-subj="lensGeneralSettingsCustomTimeRange"
            id="lensInlineGeneralSettingsCustomTimeRange"
            label={
              <FormattedMessage
                defaultMessage="Apply custom time range"
                id="xpack.lens.inlineGeneralSettings.showCustomTimeRange"
              />
            }
            onChange={(e) => setHasOwnTimeRange(e.target.checked)}
          />
        </EuiFormRow>
        {hasOwnTimeRange ? (
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.lens.inlineGeneralSettings.timeRangeLabel"
                defaultMessage="Time range"
              />
            }
          >
            <EuiSuperDatePicker
              compressed
              start={timeRange?.from ?? undefined}
              end={timeRange?.to ?? undefined}
              onTimeChange={({ start, end }) => setTimeRange({ from: start, to: end })}
              showUpdateButton={false}
              dateFormat={dateFormat}
              commonlyUsedRanges={commonlyUsedRangesForDatePicker}
              data-test-subj="lensGeneralSettingsTimeRangePicker"
            />
          </EuiFormRow>
        ) : null}
      </>
    );
  };

  const renderBorderlessToggleComponent = () => (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiSwitch
          compressed
          checked={!isPanelBorderless}
          data-test-subj="lensGeneralSettingsBorderToggle"
          id="lensInlineGeneralSettingsBorder"
          label={
            <FormattedMessage
              defaultMessage="Show panel border"
              id="xpack.lens.inlineGeneralSettings.showBorder"
            />
          }
          onChange={(e) => setIsPanelBorderless(!e.target.checked)}
        />
      </EuiFormRow>
    </>
  );

  const { euiTheme } = useEuiTheme();

  return (
    <EuiAccordion
      id="lens-general-settings"
      css={css`
        inline-size: 100%;

        .euiAccordion__childWrapper {
          inline-size: 100%;
          max-inline-size: 100%;
        }
      `}
      buttonContent={
        <EuiTitle
          size="xxs"
          css={css`
            padding: 2px;
          `}
        >
          <h5>
            {i18n.translate('xpack.lens.inlineGeneralSettings.accordionTitle', {
              defaultMessage: 'General settings',
            })}
          </h5>
        </EuiTitle>
      }
      buttonProps={{
        paddingSize: 'm',
      }}
      initialIsOpen={isAccordionOpen}
      forceState={isAccordionOpen ? 'open' : 'closed'}
      onToggle={onAccordionToggle}
      data-test-subj="lensGeneralSettingsAccordion"
    >
      <EuiForm
        fullWidth
        data-test-subj="lensInlineGeneralSettingsForm"
        css={css`
          padding: 0 0 ${euiTheme.size.base};
        `}
      >
        {renderCustomTitleComponent()}
        {renderBorderlessToggleComponent()}
        {renderCustomTimeRangeComponent()}
      </EuiForm>
    </EuiAccordion>
  );
});

GeneralSettingsAccordion.displayName = 'GeneralSettingsAccordion';
