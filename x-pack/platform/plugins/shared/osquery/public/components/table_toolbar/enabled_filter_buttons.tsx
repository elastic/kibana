/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type EnabledFilter = 'true' | 'false' | undefined;

const ENABLED_LABEL = i18n.translate('xpack.osquery.tableToolbar.enabledLabel', {
  defaultMessage: 'Enabled',
});

const DISABLED_LABEL = i18n.translate('xpack.osquery.tableToolbar.disabledLabel', {
  defaultMessage: 'Disabled',
});

interface EnabledFilterButtonsProps {
  value: EnabledFilter;
  onChange: (value: EnabledFilter) => void;
  'data-test-subj'?: string;
}

const EnabledFilterButtonsComponent: React.FC<EnabledFilterButtonsProps> = ({
  value,
  onChange,
  'data-test-subj': dataTestSubj = 'enabled-filter',
}) => {
  const handleEnabledClick = useCallback(() => {
    onChange(value === 'true' ? undefined : 'true');
  }, [value, onChange]);

  const handleDisabledClick = useCallback(() => {
    onChange(value === 'false' ? undefined : 'false');
  }, [value, onChange]);

  return (
    <EuiFilterGroup>
      <EuiFilterButton
        withNext
        isToggle
        isSelected={value === 'true'}
        hasActiveFilters={value === 'true'}
        onClick={handleEnabledClick}
        data-test-subj={`${dataTestSubj}-enabled`}
      >
        {ENABLED_LABEL}
      </EuiFilterButton>
      <EuiFilterButton
        isToggle
        isSelected={value === 'false'}
        hasActiveFilters={value === 'false'}
        onClick={handleDisabledClick}
        data-test-subj={`${dataTestSubj}-disabled`}
      >
        {DISABLED_LABEL}
      </EuiFilterButton>
    </EuiFilterGroup>
  );
};

EnabledFilterButtonsComponent.displayName = 'EnabledFilterButtons';

export const EnabledFilterButtons = React.memo(EnabledFilterButtonsComponent);
