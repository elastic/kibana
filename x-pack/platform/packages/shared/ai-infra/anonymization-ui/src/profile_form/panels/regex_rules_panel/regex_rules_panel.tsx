/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiButtonGroup,
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import {
  ANONYMIZATION_ENTITY_CLASSES,
  type AnonymizationEntityClass,
  type RegexRule,
} from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import { useProfileFormContext } from '../../profile_form_context';
import { isAnonymizationEntityClass } from '../../../common/utils/is_anonymization_entity_class';

const REGEX_RULE_STATE_ENABLED = 'enabled';
const REGEX_RULE_STATE_DISABLED = 'disabled';
const DEFAULT_ENTITY_CLASS: AnonymizationEntityClass = 'MISC';

export const RegexRulesPanel = () => {
  const { regexRules, onRegexRulesChange, isManageMode, isSubmitting, regexRulesError } =
    useProfileFormContext();
  const [regexDraft, setRegexDraft] = useState<{
    pattern: string;
    entityClass: AnonymizationEntityClass | '';
  }>({ pattern: '', entityClass: DEFAULT_ENTITY_CLASS });
  const showValidationErrors = Boolean(regexRulesError);
  const entityClassOptions = [
    {
      value: '',
      text: i18n.translate('anonymizationUi.profiles.regexRules.entityClassSelectPlaceholder', {
        defaultMessage: 'Select entity class',
      }),
    },
    ...ANONYMIZATION_ENTITY_CLASSES.map((value) => ({ value, text: value })),
  ];

  const updateRegexRule = useCallback(
    (index: number, next: RegexRule) => {
      const updated = [...regexRules];
      updated[index] = next;
      onRegexRulesChange(updated);
    },
    [onRegexRulesChange, regexRules]
  );

  const addRegexRule = useCallback(() => {
    const nextPattern = regexDraft.pattern.trim();
    const nextEntityClass = regexDraft.entityClass.trim();
    if (!nextPattern || !isAnonymizationEntityClass(nextEntityClass)) {
      return;
    }
    onRegexRulesChange([
      ...regexRules,
      {
        id: `${Date.now()}`,
        type: 'regex',
        pattern: nextPattern,
        entityClass: nextEntityClass,
        enabled: true,
      },
    ]);
    setRegexDraft({ pattern: '', entityClass: DEFAULT_ENTITY_CLASS });
  }, [onRegexRulesChange, regexDraft.entityClass, regexDraft.pattern, regexRules]);

  const removeRegexRule = useCallback(
    (index: number) => onRegexRulesChange(regexRules.filter((_, itemIndex) => itemIndex !== index)),
    [onRegexRulesChange, regexRules]
  );

  const columns: Array<EuiBasicTableColumn<RegexRule>> = [
    {
      field: 'pattern',
      name: (
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {i18n.translate('anonymizationUi.profiles.regexRules.header.pattern', {
              defaultMessage: 'Regex pattern',
            })}
          </EuiTextColor>
        </EuiText>
      ),
      render: (_value: string, rule: RegexRule) => {
        const isInvalid = showValidationErrors && !rule.pattern.trim();
        return (
          <EuiFieldText
            compressed
            value={rule.pattern}
            isInvalid={isInvalid}
            aria-label={i18n.translate('anonymizationUi.profiles.regexRules.row.patternAriaLabel', {
              defaultMessage: 'Regex pattern for rule {id}',
              values: { id: rule.id },
            })}
            onChange={(event) =>
              updateRegexRule(
                regexRules.findIndex((item) => item.id === rule.id),
                { ...rule, pattern: event.target.value }
              )
            }
            disabled={!isManageMode || isSubmitting}
            placeholder={i18n.translate('anonymizationUi.profiles.regexRules.patternPlaceholder', {
              defaultMessage:
                "Regex pattern (for example: /\\b\\d'{1,3}'(?:\\.\\d'{1,3}')'{3}'\\b/)",
            })}
            fullWidth
          />
        );
      },
    },
    {
      field: 'entityClass',
      name: (
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {i18n.translate('anonymizationUi.profiles.regexRules.header.entityClass', {
              defaultMessage: 'Entity class',
            })}
          </EuiTextColor>
        </EuiText>
      ),
      width: '220px',
      render: (_value: string, rule: RegexRule) => {
        const isInvalid = showValidationErrors && !rule.entityClass.trim();
        return (
          <EuiSelect
            compressed
            value={rule.entityClass}
            isInvalid={isInvalid}
            aria-label={i18n.translate(
              'anonymizationUi.profiles.regexRules.row.entityClassAriaLabel',
              {
                defaultMessage: 'Entity class for regex rule {id}',
                values: { id: rule.id },
              }
            )}
            options={entityClassOptions}
            onChange={(event) =>
              updateRegexRule(
                regexRules.findIndex((item) => item.id === rule.id),
                isAnonymizationEntityClass(event.target.value)
                  ? { ...rule, entityClass: event.target.value }
                  : rule
              )
            }
            disabled={!isManageMode || isSubmitting}
            fullWidth
          />
        );
      },
    },
    {
      field: 'enabled',
      name: (
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {i18n.translate('anonymizationUi.profiles.regexRules.header.state', {
              defaultMessage: 'State',
            })}
          </EuiTextColor>
        </EuiText>
      ),
      width: '180px',
      render: (_value: boolean, rule: RegexRule) => (
        <EuiButtonGroup
          legend={i18n.translate('anonymizationUi.profiles.regexRules.stateLegend', {
            defaultMessage: 'Regex rule state for {id}',
            values: { id: rule.id },
          })}
          options={[
            {
              id: REGEX_RULE_STATE_ENABLED,
              label: i18n.translate('anonymizationUi.profiles.regexRules.enabledLabel', {
                defaultMessage: 'Enabled',
              }),
            },
            {
              id: REGEX_RULE_STATE_DISABLED,
              label: i18n.translate('anonymizationUi.profiles.regexRules.disabledLabel', {
                defaultMessage: 'Disabled',
              }),
            },
          ]}
          idSelected={rule.enabled ? REGEX_RULE_STATE_ENABLED : REGEX_RULE_STATE_DISABLED}
          onChange={(value) =>
            updateRegexRule(
              regexRules.findIndex((item) => item.id === rule.id),
              {
                ...rule,
                enabled: value === REGEX_RULE_STATE_ENABLED,
              }
            )
          }
          buttonSize="compressed"
          isDisabled={!isManageMode || isSubmitting}
          type="single"
        />
      ),
    },
    {
      name: (
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {i18n.translate('anonymizationUi.profiles.regexRules.header.actions', {
              defaultMessage: 'Actions',
            })}
          </EuiTextColor>
        </EuiText>
      ),
      width: '50px',
      actions: [
        {
          name: i18n.translate('anonymizationUi.profiles.regexRules.removeButton', {
            defaultMessage: 'Remove',
          }),
          description: i18n.translate('anonymizationUi.profiles.regexRules.removeButton', {
            defaultMessage: 'Remove',
          }),
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          enabled: () => isManageMode && !isSubmitting,
          onClick: (rule: RegexRule) => {
            const index = regexRules.findIndex((item) => item.id === rule.id);
            if (index >= 0) {
              removeRegexRule(index);
            }
          },
          'data-test-subj': 'anonymizationProfilesRegexRuleRemove',
        },
      ],
    },
  ];

  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('anonymizationUi.profiles.regexRules.title', {
            defaultMessage: 'Regex rules',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {regexRulesError ? (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={regexRulesError}
            size="s"
          />
          <EuiSpacer size="s" />
        </>
      ) : null}

      <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('anonymizationUi.profiles.regexRules.create.patternLabel', {
              defaultMessage: 'Regex pattern',
            })}
            fullWidth
          >
            <EuiFieldText
              compressed
              value={regexDraft.pattern}
              aria-label={i18n.translate(
                'anonymizationUi.profiles.regexRules.create.patternAriaLabel',
                {
                  defaultMessage: 'New regex pattern',
                }
              )}
              onChange={(event) =>
                setRegexDraft((draft) => ({ ...draft, pattern: event.target.value }))
              }
              placeholder={i18n.translate(
                'anonymizationUi.profiles.regexRules.patternPlaceholder',
                {
                  defaultMessage:
                    "Regex pattern (for example: /\\b\\d'{1,3}'(?:\\.\\d'{1,3}')'{3}'\\b/)",
                }
              )}
              disabled={!isManageMode || isSubmitting}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 220 }}>
          <EuiFormRow
            label={i18n.translate('anonymizationUi.profiles.regexRules.create.entityClassLabel', {
              defaultMessage: 'Entity class',
            })}
            fullWidth
          >
            <EuiSelect
              compressed
              value={regexDraft.entityClass}
              aria-label={i18n.translate(
                'anonymizationUi.profiles.regexRules.create.entityClassAriaLabel',
                {
                  defaultMessage: 'New entity class',
                }
              )}
              options={entityClassOptions}
              onChange={(event) =>
                setRegexDraft((draft) => ({
                  ...draft,
                  entityClass: isAnonymizationEntityClass(event.target.value)
                    ? event.target.value
                    : '',
                }))
              }
              disabled={!isManageMode || isSubmitting}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={addRegexRule}
            isDisabled={
              !isManageMode ||
              isSubmitting ||
              regexDraft.pattern.trim().length === 0 ||
              regexDraft.entityClass.trim().length === 0
            }
          >
            {i18n.translate('anonymizationUi.profiles.regexRules.addButton', {
              defaultMessage: 'Add regex',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {regexRules.length === 0 ? (
        <EuiCallOut
          announceOnMount
          color="primary"
          iconType="info"
          title={i18n.translate('anonymizationUi.profiles.regexRules.emptyStateTitle', {
            defaultMessage: 'No regex rules configured',
          })}
          data-test-subj="anonymizationProfilesRegexRulesEmptyState"
        >
          <p>
            {i18n.translate('anonymizationUi.profiles.regexRules.emptyStateDescription', {
              defaultMessage:
                'Use regex rules to match patterns in field values (for example email addresses or IP addresses) and map those matches to an entity-class mask.',
            })}
          </p>
          <p>
            {i18n.translate('anonymizationUi.profiles.regexRules.emptyStateHint', {
              defaultMessage:
                'Add a regex pattern, choose an entity class, and keep the rule enabled to apply it during anonymization.',
            })}
          </p>
        </EuiCallOut>
      ) : (
        <EuiBasicTable
          tableCaption={i18n.translate('anonymizationUi.profiles.regexRules.tableCaption', {
            defaultMessage: 'Regex rules',
          })}
          items={regexRules}
          columns={columns}
          compressed
          data-test-subj="anonymizationProfilesRegexRulesTable"
        />
      )}
    </>
  );
};
