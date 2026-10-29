/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSwitch,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { HeaderActionButton } from '@kbn/core-chrome-browser-components';
import { i18n } from '@kbn/i18n';
import { BOOST_RESTORE_API_PATH } from '../../common/constants';
import type { PrototypeSettings } from '../../common/prototype_settings';
import { setPrototypeSettings, usePrototypeSettings } from './prototype_settings';

interface PrototypeMenuProps {
  http: HttpStart;
  notifications: NotificationsStart;
  onRestored: () => void;
}

const PROTOTYPE_MENU_LABEL = i18n.translate('xpack.boost.prototype.menuLabel', {
  defaultMessage: 'Prototype tools',
});

/** Global header menu of prototype-only actions. */
export const PrototypeMenu = ({ http, notifications, onRestored }: PrototypeMenuProps) => {
  const popoverId = useGeneratedHtmlId({ prefix: 'boostPrototypeMenu' });
  const modalTitleId = useGeneratedHtmlId();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { shows_estimates: showsEstimates, allows_multiple_targets: allowsMultipleTargets } =
    usePrototypeSettings();
  const { euiTheme } = useEuiTheme();

  const changeSettings = (changes: Partial<PrototypeSettings>) =>
    setPrototypeSettings(changes).catch((error) =>
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.boost.prototype.settingsErrorTitle', {
          defaultMessage: 'Unable to change prototype settings',
        }),
      })
    );

  const onConfirmRestore = async () => {
    setIsRestoring(true);
    try {
      await http.post(BOOST_RESTORE_API_PATH);
      onRestored();
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.boost.prototype.restoreErrorTitle', {
          defaultMessage: 'Unable to restore prototype defaults',
        }),
      });
      setIsRestoring(false);
      setIsModalVisible(false);
    }
  };

  return (
    <>
      <EuiPopover
        id={popoverId}
        aria-label={PROTOTYPE_MENU_LABEL}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="downRight"
        panelPaddingSize="none"
        button={
          <EuiToolTip content={PROTOTYPE_MENU_LABEL} disableScreenReaderOutput>
            <HeaderActionButton
              variant="bordered"
              aria-label={PROTOTYPE_MENU_LABEL}
              aria-expanded={isPopoverOpen}
              aria-haspopup={true}
              onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
              data-test-subj="boostPrototypeMenuButton"
            >
              <EuiIcon type="flask" size="m" color="subdued" aria-hidden />
            </HeaderActionButton>
          </EuiToolTip>
        }
      >
        <EuiPopoverTitle paddingSize="m">{PROTOTYPE_MENU_LABEL}</EuiPopoverTitle>
        {/* Shared by everyone testing the prototype, like its data, and off once it's restored. */}
        <div css={{ display: 'grid', gap: euiTheme.size.m, padding: euiTheme.size.base }}>
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.boost.prototype.showEstimates', {
              defaultMessage: 'Show cost and VCU estimates',
            })}
            checked={showsEstimates}
            onChange={({ target: { checked } }) => changeSettings({ shows_estimates: checked })}
            data-test-subj="boostShowEstimatesSwitch"
          />
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.boost.prototype.allowMultipleTargets', {
              defaultMessage: 'Select multiple targets per rule',
            })}
            checked={allowsMultipleTargets}
            onChange={({ target: { checked } }) =>
              changeSettings({ allows_multiple_targets: checked })
            }
            data-test-subj="boostAllowMultipleTargetsSwitch"
          />
        </div>
        <EuiHorizontalRule margin="none" />
        <EuiContextMenuPanel
          items={[
            <EuiContextMenuItem
              key="restoreDefaults"
              onClick={() => {
                setIsPopoverOpen(false);
                setIsModalVisible(true);
              }}
              data-test-subj="boostRestorePrototypeDefaults"
            >
              {i18n.translate('xpack.boost.prototype.restoreMenuItem', {
                defaultMessage: 'Restore prototype defaults',
              })}
            </EuiContextMenuItem>,
          ]}
        />
      </EuiPopover>

      {isModalVisible && (
        <EuiConfirmModal
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          title={i18n.translate('xpack.boost.prototype.restoreModalTitle', {
            defaultMessage: 'Restore prototype defaults?',
          })}
          onCancel={() => setIsModalVisible(false)}
          onConfirm={onConfirmRestore}
          cancelButtonText={i18n.translate('xpack.boost.prototype.restoreModalCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.boost.prototype.restoreModalConfirm', {
            defaultMessage: 'Restore defaults',
          })}
          buttonColor="danger"
          isLoading={isRestoring}
        >
          <p>
            {i18n.translate('xpack.boost.prototype.restoreModalBody', {
              defaultMessage:
                'This discards all boost changes, restores the sample boost profiles and rules, turns off the prototype settings, and re-creates any missing sample indices and data streams. It affects everyone using this deployment. The page reloads afterward.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
