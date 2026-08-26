/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import { DatasetSettingsAdvancedViewToggle } from './dataset_settings_advanced_view_toggle';
import { DatasetSettingsFieldsLayout } from './dataset_settings_fields_layout';
import { getFlow3CommonFields } from './dataset_settings_flow3_layout';
import type { DatasetWizardFormValues } from '../create_dataset_wizard/dataset_wizard_form_state';

const accordionButtonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

const APP_MAIN_SCROLL_ID = 'app-main-scroll';
const WIZARD_FOOTER_TEST_SUBJ = 'datasetWizardFooter';
const MIN_ADVANCED_SETTINGS_HEIGHT = 160;
const ADVANCED_SETTINGS_FOOTER_GAP = 16;

const getAdvancedSettingsMaxHeight = (panel: HTMLElement): number => {
  const scrollContainer = document.getElementById(APP_MAIN_SCROLL_ID);
  const footer = document.querySelector(`[data-test-subj="${WIZARD_FOOTER_TEST_SUBJ}"]`);
  const viewportBottom = scrollContainer?.getBoundingClientRect().bottom ?? window.innerHeight;
  const footerHeight = footer instanceof HTMLElement ? footer.getBoundingClientRect().height : 72;
  const available =
    viewportBottom -
    panel.getBoundingClientRect().top -
    footerHeight -
    ADVANCED_SETTINGS_FOOTER_GAP;

  return Math.max(available, MIN_ADVANCED_SETTINGS_HEIGHT) * 2 + 200;
};

export interface DatasetSettingsFlow3SettingsPanelProps {
  control: Control<DatasetWizardFormValues>;
  getValues: UseFormGetValues<DatasetWizardFormValues>;
  setValue: UseFormSetValue<DatasetWizardFormValues>;
  format: Exclude<DatasetFormatFormValue, ''>;
  commonSettingsTitle: string;
  advancedSettingsTitle: string;
  testSubjPrefix?: string;
}

export const DatasetSettingsFlow3SettingsPanel: FunctionComponent<
  DatasetSettingsFlow3SettingsPanelProps
> = ({
  control,
  getValues,
  setValue,
  format,
  commonSettingsTitle,
  advancedSettingsTitle,
  testSubjPrefix = 'datasetWizard',
}) => {
  const errorMode = useWatch({ control, name: 'settings.error_mode' }) as DatasetErrorModeFormValue;
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedSettingsMaxHeight, setAdvancedSettingsMaxHeight] = useState<number | undefined>();
  const advancedSettingsPanelRef = useRef<HTMLDivElement>(null);

  const commonFields = useMemo(() => getFlow3CommonFields(format, errorMode), [errorMode, format]);

  const advancedSettingsAccordionId = useGeneratedHtmlId({
    prefix: 'datasetWizardFlow3AdvancedSettingsAccordion',
  });

  useLayoutEffect(() => {
    if (!isAdvancedOpen) {
      return;
    }

    const panel = advancedSettingsPanelRef.current;
    if (!panel) {
      return;
    }

    const updateMaxHeight = () => {
      setAdvancedSettingsMaxHeight(getAdvancedSettingsMaxHeight(panel));
    };

    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);

    return () => {
      window.removeEventListener('resize', updateMaxHeight);
    };
  }, [errorMode, format, isAdvancedOpen]);

  const advancedSettingsPanelCss = useMemo(
    () => css`
      max-height: ${advancedSettingsMaxHeight === undefined
        ? 'calc((100dvh - 24rem) * 2 + 200px)'
        : `${advancedSettingsMaxHeight}px`};
      overflow-y: auto;
      overscroll-behavior: contain;
    `,
    [advancedSettingsMaxHeight]
  );

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel
        color="subdued"
        paddingSize="m"
        hasShadow={false}
        data-test-subj={`${testSubjPrefix}Flow3CommonSettingsPanel`}
      >
        <EuiTitle size="xs">
          <h3>{commonSettingsTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <DatasetSettingsFieldsLayout
          control={control}
          fields={commonFields}
          testSubjPrefix={testSubjPrefix}
          columns={1}
        />
      </EuiPanel>

      <EuiSpacer size="l" />
      <EuiAccordion
        id={advancedSettingsAccordionId}
        element="fieldset"
        borders="horizontal"
        buttonProps={{ paddingSize: 'm', css: accordionButtonCss }}
        buttonContent={
          <EuiTitle size="xs">
            <h3>{advancedSettingsTitle}</h3>
          </EuiTitle>
        }
        data-test-subj={`${testSubjPrefix}Flow3AdvancedSettingsAccordion`}
        initialIsOpen={false}
        paddingSize="none"
        onToggle={setIsAdvancedOpen}
      >
        <div ref={advancedSettingsPanelRef}>
          <EuiPanel
            color="subdued"
            paddingSize="m"
            hasShadow={false}
            css={advancedSettingsPanelCss}
            data-test-subj={`${testSubjPrefix}Flow3AdvancedSettingsPanel`}
          >
            <DatasetSettingsAdvancedViewToggle
              control={control}
              getValues={getValues}
              setValue={setValue}
              format={format}
              errorMode={errorMode}
              testSubjPrefix={testSubjPrefix}
            />
          </EuiPanel>
        </div>
      </EuiAccordion>
    </>
  );
};
