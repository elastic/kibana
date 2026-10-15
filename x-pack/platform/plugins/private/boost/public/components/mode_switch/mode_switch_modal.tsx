/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
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
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ModeSwitchRuleChanges } from '../../../common/mode_switch';
import type { BoostMode } from '../../../common/types';
import { formatDataSourceCount } from '../format';
import { RuleChangeList, RuleChangeTable } from '../rule_change_list';

interface ModeSwitchModalProps {
  /** The mode being switched to. */
  mode: BoostMode;
  changes: readonly ModeSwitchRuleChanges[];
  isSwitching: boolean;
  onCancel: () => void;
  /** Switches modes, and whether to skip this confirmation next time. */
  onConfirm: (shouldSkipNextTime: boolean) => void;
}

const DEFAULT_BADGE_LABEL = i18n.translate('xpack.boost.modeSwitchModal.defaultBadge', {
  defaultMessage: 'Default',
});

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
          'The indices and data streams below change boost profile. Nothing is deleted, and turning advanced mode back on restores them.',
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

/**
 * Confirms switching modes when it changes the boost profile of any index or data stream, listing
 * each change under the rule behind it.
 */
export const ModeSwitchModal = ({
  mode,
  changes,
  isSwitching,
  onCancel,
  onConfirm,
}: ModeSwitchModalProps) => {
  const titleId = useGeneratedHtmlId();
  const listTitleId = useGeneratedHtmlId({ prefix: 'modeSwitchRules' });
  const skipCheckboxId = useGeneratedHtmlId({ prefix: 'modeSwitchSkip' });
  const [shouldSkipNextTime, setShouldSkipNextTime] = useState(false);
  const isTurningOff = mode === 'simple';

  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={onCancel}
      maxWidth={576}
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
              changes.some(({ rule }) => !rule.is_builtin),
              changes.some(({ rule }) => rule.is_builtin)
            )}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFormLabel id={listTitleId}>
          {i18n.translate('xpack.boost.modeSwitchModal.rulesListTitle', {
            defaultMessage: '{count, plural, one {# rule} other {# rules}} with changes',
            values: { count: changes.length },
          })}
        </EuiFormLabel>
        <EuiSpacer size="xs" />
        <RuleChangeList
          titleId={listTitleId}
          items={changes.map(({ rule, changes: ruleChanges }) => {
            const [{ type }] = ruleChanges;
            return {
              name: rule.name,
              nameAppend: rule.is_builtin && <EuiBadge>{DEFAULT_BADGE_LABEL}</EuiBadge>,
              count: formatDataSourceCount(type, ruleChanges.length),
              details: (
                <RuleChangeTable
                  aria-label={i18n.translate('xpack.boost.modeSwitchModal.changesTableLabel', {
                    defaultMessage:
                      'Data sources that {ruleName} changes, and the boost profile each changes to',
                    values: { ruleName: rule.name },
                  })}
                  nameHeader={
                    type === 'indices'
                      ? i18n.translate('xpack.boost.modeSwitchModal.affectedIndexColumn', {
                          defaultMessage: 'Affected index',
                        })
                      : i18n.translate('xpack.boost.modeSwitchModal.affectedDataStreamColumn', {
                          defaultMessage: 'Affected data stream',
                        })
                  }
                  valueHeader={i18n.translate('xpack.boost.modeSwitchModal.profileColumn', {
                    defaultMessage: 'Boost profile',
                  })}
                  rows={ruleChanges.map(({ name, from, to }) => ({
                    name,
                    value: i18n.translate('xpack.boost.modeSwitchModal.profileChange', {
                      defaultMessage: '{from} → {to}',
                      values: { from, to },
                    }),
                  }))}
                />
              ),
              'data-test-subj': `modeSwitchRule-${rule.name}`,
            };
          })}
        />
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
