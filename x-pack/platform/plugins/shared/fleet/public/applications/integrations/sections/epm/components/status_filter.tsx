/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPopover, EuiFilterButton, EuiSelectable, type EuiSelectableOption } from '@elastic/eui';

import { useAuthz, useStartServices, usePutSettingsMutation } from '../../../hooks';

import {
  STATUS_BETA,
  STATUS_DEPRECATED,
  type IntegrationStatusFilterType,
} from '../screens/browse_integrations/types';

export interface StatusFilterProps {
  selectedStatuses?: IntegrationStatusFilterType[];
  onChange: (statuses: IntegrationStatusFilterType[]) => void;
  testSubjPrefix?: string;
  popoverId?: string;
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatuses = [],
  onChange,
  testSubjPrefix = 'statusFilter',
  popoverId = 'statusPopover',
}) => {
  const authz = useAuthz();
  const { notifications } = useStartServices();
  const { mutateAsync: mutateSettingsAsync } = usePutSettingsMutation();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const canUpdateBetaSetting = authz.fleet.allSettings;

  const updateBetaSettings = useCallback(
    async (prerelease: boolean) => {
      if (!canUpdateBetaSetting) return;

      try {
        const res = await mutateSettingsAsync({
          prerelease_integrations_enabled: prerelease,
        });

        if (res.error) {
          throw res.error;
        }
      } catch (error) {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.errorUpdatingSettings', {
            defaultMessage: 'Error updating settings',
          }),
        });
      }
    },
    [canUpdateBetaSetting, mutateSettingsAsync, notifications.toasts]
  );

  const hasBeta = selectedStatuses.includes(STATUS_BETA);
  const hasDeprecated = selectedStatuses.includes(STATUS_DEPRECATED);

  const options: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.translate('xpack.fleet.epm.statusFilter.betaOption', {
          defaultMessage: 'Beta integrations',
        }),
        key: STATUS_BETA,
        checked: hasBeta ? 'on' : undefined,
        hidden: !canUpdateBetaSetting,
        'data-test-subj': `${testSubjPrefix}.statusBetaOption`,
      },
      {
        label: i18n.translate('xpack.fleet.epm.statusFilter.deprecatedOption', {
          defaultMessage: 'Deprecated integrations',
        }),
        key: STATUS_DEPRECATED,
        checked: hasDeprecated ? 'on' : undefined,
        'data-test-subj': `${testSubjPrefix}.statusDeprecatedOption`,
      },
    ],
    [canUpdateBetaSetting, hasBeta, hasDeprecated, testSubjPrefix]
  );

  const activeCount = selectedStatuses.length;

  const onSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newStatuses: IntegrationStatusFilterType[] = [];

      newOptions.forEach((option) => {
        if (option.checked === 'on' && option.key) {
          newStatuses.push(option.key as IntegrationStatusFilterType);
        }
      });

      // Check if beta was toggled
      const betaWasOn = hasBeta;
      const betaIsOn = newStatuses.includes('beta');
      if (betaWasOn !== betaIsOn) {
        updateBetaSettings(betaIsOn);
      }

      onChange(newStatuses);
    },
    [hasBeta, onChange, updateBetaSettings]
  );

  return (
    <EuiPopover
      id={popoverId}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          data-test-subj={`${testSubjPrefix}.statusBtn`}
          iconType="arrowDown"
          onClick={togglePopover}
          isSelected={isOpen}
          numFilters={activeCount}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount}
        >
          <FormattedMessage id="xpack.fleet.epm.statusFilter.label" defaultMessage="Status" />
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        data-test-subj={`${testSubjPrefix}.statusSelectableList`}
        searchable={false}
        options={options}
        onChange={onSelectionChange}
        listProps={{
          paddingSize: 's',
          showIcons: true,
          style: {
            minWidth: 250,
          },
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
