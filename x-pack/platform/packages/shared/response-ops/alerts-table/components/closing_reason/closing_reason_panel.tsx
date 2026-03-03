/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import * as i18n from './translations';

const CUSTOM_ALERT_CLOSE_REASONS_SETTING_KEY = 'securitySolution:alertCloseReasons';

interface ClosingReasonOption {
  key?: string;
}

const defaultClosingReasons: Array<EuiSelectableOption<ClosingReasonOption>> = [
  { label: i18n.CLOSING_REASON_CLOSE_WITHOUT_REASON, key: undefined },
  { label: i18n.CLOSING_REASON_DUPLICATE, key: 'duplicate' },
  { label: i18n.CLOSING_REASON_FALSE_POSITIVE, key: 'false_positive' },
  { label: i18n.CLOSING_REASON_TRUE_POSITIVE, key: 'true_positive' },
  { label: i18n.CLOSING_REASON_BENIGN_POSITIVE, key: 'benign_positive' },
  { label: i18n.CLOSING_REASON_OTHER, key: 'other' },
];

export interface ClosingReasonPanelProps {
  onSubmit: (reason?: string) => void;
}

const ClosingReasonPanelComponent: React.FC<ClosingReasonPanelProps> = ({ onSubmit }) => {
  const {
    services: { uiSettings },
  } = useKibana<{ uiSettings: IUiSettingsClient }>();

  const customClosingReasons =
    uiSettings.get<string[]>(CUSTOM_ALERT_CLOSE_REASONS_SETTING_KEY) ?? [];

  const [options, setOptions] = useState<Array<EuiSelectableOption<ClosingReasonOption>>>([
    ...defaultClosingReasons,
    ...customClosingReasons.map((reason) => ({ label: reason, key: reason })),
  ]);

  const selectedOption = useMemo(() => options.find((option) => option.checked), [options]);

  const onSubmitHandler = useCallback(() => {
    if (!selectedOption) {
      return;
    }

    onSubmit(selectedOption.key);
  }, [onSubmit, selectedOption]);

  return (
    <>
      <EuiSelectable options={options} onChange={setOptions} singleSelection="always">
        {(list) => list}
      </EuiSelectable>
      <EuiButton fullWidth size="s" disabled={!selectedOption} onClick={onSubmitHandler}>
        {i18n.CLOSING_REASON_BUTTON_MESSAGE}
      </EuiButton>
    </>
  );
};

export const ClosingReasonPanel = memo(ClosingReasonPanelComponent);
