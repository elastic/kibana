/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ModeSwitchChange } from '../../../common/mode_switch';
import type { BoostMode, BoostProfileType } from '../../../common/types';
import { ChangeTable } from '../change_table';
import { formatDataSourceCounts } from '../format';
import { MODAL_WIDTH } from '../modal_width';

interface ModeSwitchModalProps {
  /** The mode being switched to. */
  mode: BoostMode;
  changes: readonly ModeSwitchChange[];
  isSwitching: boolean;
  onCancel: () => void;
  /** Switches modes, and whether to skip this confirmation next time. */
  onConfirm: (shouldSkipNextTime: boolean) => void;
}

const getCause = (mode: BoostMode, hasCustomRules: boolean, hasDefaultRules: boolean) => {
  if (mode === 'simple') {
    return hasCustomRules && hasDefaultRules
      ? i18n.translate('xpack.boost.modeSwitchModal.suspendBoth', {
          defaultMessage:
            'Turning off advanced mode suspends custom boost rules and profiles, and default rules go back to the profiles chosen in simple mode.',
        })
      : hasCustomRules
      ? i18n.translate('xpack.boost.modeSwitchModal.suspendRules', {
          defaultMessage: 'Turning off advanced mode suspends custom boost rules and profiles.',
        })
      : i18n.translate('xpack.boost.modeSwitchModal.suspendDefaults', {
          defaultMessage: 'Default rules go back to the profiles chosen in simple mode.',
        });
  }
  return hasCustomRules && hasDefaultRules
    ? i18n.translate('xpack.boost.modeSwitchModal.restoreBoth', {
        defaultMessage:
          'Advanced mode restores your custom boost rules, and the custom profiles chosen for default rules.',
      })
    : hasCustomRules
    ? i18n.translate('xpack.boost.modeSwitchModal.restoreRules', {
        defaultMessage: 'Advanced mode restores your custom boost rules.',
      })
    : i18n.translate('xpack.boost.modeSwitchModal.restoreDefaults', {
        defaultMessage: 'Advanced mode restores the custom profiles chosen for default rules.',
      });
};

/** How many indices and how many data streams change, leaving out a type with none. */
const getEffect = (changes: readonly ModeSwitchChange[]) => {
  const indexCount = changes.filter(({ type }) => type === 'indices').length;
  return i18n.translate('xpack.boost.modeSwitchModal.effect', {
    defaultMessage: 'This will cause the {targets} below to change boost profile.',
    values: { targets: formatDataSourceCounts(indexCount, changes.length - indexCount) },
  });
};

const getSummary = (mode: BoostMode, changes: readonly ModeSwitchChange[]) =>
  [
    getCause(
      mode,
      changes.some(({ cause }) => cause === 'custom_rule'),
      changes.some(({ cause }) => cause === 'default_rule')
    ),
    getEffect(changes),
    ...(mode === 'simple'
      ? [
          i18n.translate('xpack.boost.modeSwitchModal.suspendReassurance', {
            defaultMessage:
              'No boost rules or profiles will be deleted. Returning to advanced mode will restore them.',
          }),
        ]
      : []),
  ].join(' ');

const TYPE_ICONS: Readonly<Record<BoostProfileType, { iconType: string; label: string }>> = {
  indices: {
    iconType: 'table',
    label: i18n.translate('xpack.boost.modeSwitchModal.indexIcon', { defaultMessage: 'Index' }),
  },
  data_streams: {
    iconType: 'productStreamsClassic',
    label: i18n.translate('xpack.boost.modeSwitchModal.dataStreamIcon', {
      defaultMessage: 'Data stream',
    }),
  },
};

/** Confirms switching modes when it changes the boost profile of any index or data stream. */
export const ModeSwitchModal = ({
  mode,
  changes,
  isSwitching,
  onCancel,
  onConfirm,
}: ModeSwitchModalProps) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId();
  const skipCheckboxId = useGeneratedHtmlId({ prefix: 'modeSwitchSkip' });
  const [shouldSkipNextTime, setShouldSkipNextTime] = useState(false);
  const isTurningOff = mode === 'simple';

  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={onCancel}
      maxWidth={MODAL_WIDTH}
      data-test-subj="boostModeSwitchModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {isTurningOff
            ? i18n.translate('xpack.boost.modeSwitchModal.turnOffTitle', {
                defaultMessage: 'Turn off advanced mode?',
              })
            : i18n.translate('xpack.boost.modeSwitchModal.turnOnTitle', {
                defaultMessage: 'Turn on advanced mode?',
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>{getSummary(mode, changes)}</p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiPanel hasBorder hasShadow={false} paddingSize="none">
          <ChangeTable
            aria-label={i18n.translate('xpack.boost.modeSwitchModal.changesTableLabel', {
              defaultMessage: 'Indices and data streams that change boost profile',
            })}
            columns={[
              i18n.translate('xpack.boost.modeSwitchModal.nameColumn', {
                defaultMessage: 'Data source',
              }),
              i18n.translate('xpack.boost.modeSwitchModal.currentProfileColumn', {
                defaultMessage: 'Current profile',
              }),
              i18n.translate('xpack.boost.modeSwitchModal.newProfileColumn', {
                defaultMessage: 'New profile',
              }),
            ]}
            // Each name starts with an icon for its type, which screen readers read out.
            rows={changes.map(({ name, type, from, to }) => ({
              id: name,
              cells: [
                <span css={{ display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.s }}>
                  <EuiIcon type={TYPE_ICONS[type].iconType} title={TYPE_ICONS[type].label} />
                  {name}
                </span>,
                from,
                to,
              ],
            }))}
            // Long lists scroll, keeping the modal's buttons in view.
            maxHeight={euiTheme.base * 15}
          />
        </EuiPanel>
      </EuiModalBody>

      <EuiModalFooter>
        {/* The footer lays its content out in a row, so the group grows to separate the checkbox
            from the buttons. */}
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          css={{ flexGrow: 1 }}
        >
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id={skipCheckboxId}
              label={i18n.translate('xpack.boost.modeSwitchModal.skipCheckbox', {
                defaultMessage: "Don't show this again",
              })}
              checked={shouldSkipNextTime}
              onChange={({ target: { checked } }) => setShouldSkipNextTime(checked)}
              data-test-subj="boostModeSwitchSkip"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onCancel} data-test-subj="boostModeSwitchCancel">
                  {i18n.translate('xpack.boost.modeSwitchModal.cancelButton', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={() => onConfirm(shouldSkipNextTime)}
                  isLoading={isSwitching}
                  data-test-subj="boostModeSwitchConfirm"
                >
                  {isTurningOff
                    ? i18n.translate('xpack.boost.modeSwitchModal.turnOffButton', {
                        defaultMessage: 'Turn off advanced mode',
                      })
                    : i18n.translate('xpack.boost.modeSwitchModal.turnOnButton', {
                        defaultMessage: 'Turn on advanced mode',
                      })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
