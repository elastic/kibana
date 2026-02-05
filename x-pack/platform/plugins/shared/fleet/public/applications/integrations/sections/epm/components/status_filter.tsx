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

export interface StatusFilterProps {
  showBeta?: boolean;
  showDeprecated?: boolean;
  onChange: (params: { showBeta?: boolean; showDeprecated?: boolean }) => void;
  testSubjPrefix?: string;
  popoverId?: string;
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  showBeta,
  showDeprecated,
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

  const options: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.translate('xpack.fleet.epm.statusFilter.betaOption', {
          defaultMessage: 'Beta integrations',
        }),
        key: 'beta',
        checked: showBeta === true ? 'on' : undefined,
        hidden: !canUpdateBetaSetting,
        'data-test-subj': `${testSubjPrefix}.statusBetaOption`,
      },
      {
        label: i18n.translate('xpack.fleet.epm.statusFilter.deprecatedOption', {
          defaultMessage: 'Deprecated integrations',
        }),
        key: 'deprecated',
        checked: showDeprecated === true ? 'on' : undefined,
        'data-test-subj': `${testSubjPrefix}.statusDeprecatedOption`,
      },
    ],
    [canUpdateBetaSetting, showBeta, showDeprecated, testSubjPrefix]
  );

  const activeCount = useMemo(() => {
    let count = 0;
    if (showBeta === true) count++;
    if (showDeprecated === true) count++;
    return count;
  }, [showBeta, showDeprecated]);

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const betaOption = newOptions.find((option) => option.key === 'beta');
      const deprecatedOption = newOptions.find((option) => option.key === 'deprecated');

      const newShowBeta = betaOption?.checked === 'on';
      const newShowDeprecated = deprecatedOption?.checked === 'on';

      // Update server settings if beta changed
      if (newShowBeta !== undefined && newShowBeta !== showBeta) {
        updateBetaSettings(newShowBeta);
      }

      // Pass true when checked, undefined when unchecked (to remove from URL and fall back to default)
      onChange({
        showBeta: newShowBeta ? true : undefined,
        showDeprecated: newShowDeprecated ? true : undefined,
      });
    },
    [showBeta, onChange, updateBetaSettings]
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
        onChange={handleChange}
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
