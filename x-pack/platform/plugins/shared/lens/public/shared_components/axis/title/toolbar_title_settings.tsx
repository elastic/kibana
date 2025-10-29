/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSpacer, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-utils';
import type { AxesSettingsConfig } from '@kbn/visualizations-plugin/common';
import { type LabelMode, VisLabel } from '../..';

type SettingsConfigKeys = keyof AxesSettingsConfig | 'legend';

export interface TitleSettingsProps {
  /**
   * Determines the settingId - either axis or legend
   */
  settingId: SettingsConfigKeys;
  /**
   * Determines the title
   */
  title: string | undefined;
  /**
   * Callback to title change for both title and visibility
   */
  updateTitleState: (
    state: { title?: string; visible: boolean },
    settingId: SettingsConfigKeys
  ) => void;
  /**
   * Determines if the title visibility switch is on and the input text is disabled
   */
  isTitleVisible: boolean;
  strings?: {
    header: string;
    label: string;
    getDataTestSubj: (axis: SettingsConfigKeys) => string;
  };
  placeholder?: string;
}

const axisStrings = {
  header: i18n.translate('xpack.lens.label.shared.axisHeader', {
    defaultMessage: 'Axis title',
  }),
  label: i18n.translate('xpack.lens.shared.axisNameLabel', {
    defaultMessage: 'Axis title',
  }),
  getDataTestSubj: (axis: SettingsConfigKeys) => `lns${axis}AxisTitle`,
};

export const ToolbarTitleSettings: React.FunctionComponent<TitleSettingsProps> = ({
  settingId,
  title,
  updateTitleState,
  isTitleVisible,
  strings = axisStrings,
  placeholder = i18n.translate('xpack.lens.shared.overwriteAxisTitle', {
    defaultMessage: 'Overwrite axis title',
  }),
}) => {
  const axisState = useMemo(
    () => ({
      title,
      visibility:
        !title && isTitleVisible ? 'auto' : isTitleVisible ? 'custom' : ('none' as LabelMode),
    }),
    [title, isTitleVisible]
  );
  const onTitleChange = useCallback(
    ({ title: t, visibility }: { title?: string; visibility: LabelMode }) =>
      updateTitleState({ title: t, visible: visibility !== 'none' }, settingId),
    [settingId, updateTitleState]
  );
  const { inputValue: localState, handleInputChange: onLocalTitleChange } = useDebouncedValue<{
    title?: string;
    visibility: LabelMode;
  }>(
    {
      value: axisState,
      onChange: onTitleChange,
    },
    { allowFalsyValue: true }
  );

  return (
    <>
      <EuiFormRow display="columnCompressed" label={strings.header} fullWidth>
        <VisLabel
          header={strings.label}
          dataTestSubj={strings.getDataTestSubj(settingId)}
          label={localState.title}
          mode={localState.visibility}
          placeholder={placeholder}
          hasAutoOption={true}
          handleChange={({ mode, label }) => {
            onLocalTitleChange({ title: label, visibility: mode });
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
    </>
  );
};
