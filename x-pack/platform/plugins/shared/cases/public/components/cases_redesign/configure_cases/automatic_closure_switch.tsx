/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';

import type { ClosureType } from '../../../containers/configure/types';
import * as i18n from '../../configure_cases/translations';

export interface AutomaticClosureSwitchProps {
  closureTypeSelected: ClosureType;
  disabled: boolean;
  onChangeClosureType: (newClosureType: ClosureType) => void;
}

const AutomaticClosureSwitchComponent: React.FC<AutomaticClosureSwitchProps> = ({
  closureTypeSelected,
  disabled,
  onChangeClosureType,
}) => {
  const onChange = useCallback(
    (event: EuiSwitchEvent) => {
      onChangeClosureType(event.target.checked ? 'close-by-pushing' : 'close-by-user');
    },
    [onChangeClosureType]
  );

  return (
    <EuiSwitch
      checked={closureTypeSelected === 'close-by-pushing'}
      disabled={disabled}
      label={i18n.CASE_CLOSURE_OPTIONS_NEW_INCIDENT}
      onChange={onChange}
      data-test-subj="automatic-closure-switch"
    />
  );
};

AutomaticClosureSwitchComponent.displayName = 'AutomaticClosureSwitch';

export const AutomaticClosureSwitch = React.memo(AutomaticClosureSwitchComponent);
