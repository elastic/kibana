/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiSwitch } from '@elastic/eui';

import * as i18n from '../../common/translations';

interface Props {
  /**
   * Whether the component is disabled
   */
  disabled: boolean;
  /**
   * Whether the auto extract observables setting is enabled
   */
  isEnabled: boolean;
  /**
   * Whether to show the label
   */
  showLabel?: boolean;
  /**
   * Callback when the switch is changed
   */
  onSwitchChange: (isOn: boolean) => void;
}

/**
 * This component is used to toggle the extract observables feature in the case view page.
 */
const ExtractObservablesSwitchComponent: React.FC<Props> = ({
  disabled,
  isEnabled,
  showLabel = false,
  onSwitchChange,
}) => {
  const [isOn, setIsOn] = useState(isEnabled);
  const onChange = useCallback(() => {
    if (onSwitchChange) {
      onSwitchChange(isOn);
    }

    setIsOn(!isOn);
  }, [isOn, onSwitchChange]);

  return (
    <EuiSwitch
      label={
        isOn ? i18n.EXTRACT_OBSERVABLES_SWITCH_LABEL_ON : i18n.EXTRACT_OBSERVABLES_SWITCH_LABEL_OFF
      }
      showLabel={showLabel}
      checked={isOn}
      onChange={onChange}
      disabled={disabled}
      data-test-subj="extract-observables-switch"
      aria-label={i18n.EXTRACT_OBSERVABLES_LABEL}
    />
  );
};

ExtractObservablesSwitchComponent.displayName = 'ExtractObservablesSwitchComponent';

export const ExtractObservablesSwitch = memo(ExtractObservablesSwitchComponent);
