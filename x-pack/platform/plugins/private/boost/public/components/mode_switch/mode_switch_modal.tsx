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
  EuiFormLabel,
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
import type { ChangeTableSection } from '../change_table';
import { ChangeTable } from '../change_table';
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

const getSummary = (mode: BoostMode, hasCustomRules: boolean, hasDefaultRules: boolean) => {
  if (mode === 'simple') {
    const cause =
      hasCustomRules && hasDefaultRules
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
    return [
      cause,
      i18n.translate('xpack.boost.modeSwitchModal.suspendEffect', {
        defaultMessage:
          'The indices and data streams below change boost profile. No boost rules or profiles will be deleted. Returning to advanced mode will restore them.',
      }),
    ].join(' ');
  }

  const cause =
    hasCustomRules && hasDefaultRules
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
  return [
    cause,
    i18n.translate('xpack.boost.modeSwitchModal.restoreEffect', {
      defaultMessage: 'The indices and data streams below change boost profile.',
    }),
  ].join(' ');
};

const SECTION_TITLES: Readonly<Record<BoostProfileType, (count: number) => string>> = {
  indices: (count) =>
    i18n.translate('xpack.boost.modeSwitchModal.indicesSection', {
      defaultMessage: 'Indices ({count})',
      values: { count },
    }),
  data_streams: (count) =>
    i18n.translate('xpack.boost.modeSwitchModal.dataStreamsSection', {
      defaultMessage: 'Data streams ({count})',
      values: { count },
    }),
};

/** The changes split into indices, then data streams, leaving out a type with none. */
const getSections = (changes: readonly ModeSwitchChange[]): ChangeTableSection[] =>
  (['indices', 'data_streams'] as const).flatMap((type) => {
    const rows = changes
      .filter((change) => change.type === type)
      .map(({ name, from, to }) => ({ id: name, cells: [name, from, to] }));
    return rows.length > 0 ? [{ title: SECTION_TITLES[type](rows.length), rows }] : [];
  });

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
  const listTitleId = useGeneratedHtmlId({ prefix: 'modeSwitchRules' });
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
          <p>
            {getSummary(
              mode,
              changes.some(({ cause }) => cause === 'custom_rule'),
              changes.some(({ cause }) => cause === 'default_rule')
            )}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFormLabel id={listTitleId}>
          {i18n.translate('xpack.boost.modeSwitchModal.changesListTitle', {
            defaultMessage:
              '{count, plural, one {# boost profile will change} other {# boost profiles will change}}',
            values: { count: changes.length },
          })}
        </EuiFormLabel>
        <EuiSpacer size="xs" />
        <EuiPanel hasBorder hasShadow={false} paddingSize="none">
          <ChangeTable
            aria-labelledby={listTitleId}
            columns={[
              i18n.translate('xpack.boost.modeSwitchModal.nameColumn', {
                defaultMessage: 'Index or data stream',
              }),
              i18n.translate('xpack.boost.modeSwitchModal.currentProfileColumn', {
                defaultMessage: 'Current profile',
              }),
              i18n.translate('xpack.boost.modeSwitchModal.newProfileColumn', {
                defaultMessage: 'New profile',
              }),
            ]}
            sections={getSections(changes)}
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
