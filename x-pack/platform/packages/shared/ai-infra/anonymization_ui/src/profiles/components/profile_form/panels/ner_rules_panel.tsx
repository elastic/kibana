/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import type { NerRule } from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import { useProfileFormContext } from '../profile_form_context';
import { useNerRulesPanelState } from '../hooks/use_ner_rules_panel_state';

const NER_RULE_STATE_ENABLED = 'enabled';
const NER_RULE_STATE_DISABLED = 'disabled';

const toAllowedEntitiesCsv = (values: string[]) => values.join(',');

export const NerRulesPanel = () => {
  const {
    nerRules,
    isManageMode,
    isSubmitting,
    listTrustedNerModels,
    onNerRulesChange,
    nerRulesError,
  } = useProfileFormContext();

  const {
    nerDraft,
    trustedNerModelOptions,
    trustedNerModelsError,
    isTrustedNerModelsLoading,
    usesTrustedNerModelProvider,
    hasTrustedNerModel,
    isNerInputDisabled,
    showValidationErrors,
    addNerRule,
    removeNerRuleById,
    setNerDraftModelId,
    setNerDraftAllowedEntities,
    updateRuleModelId,
    updateRuleAllowedEntityClasses,
    updateRuleEnabled,
    getModelOptionsForRule,
    canAddRule,
  } = useNerRulesPanelState({
    nerRules,
    onNerRulesChange,
    isManageMode,
    isSubmitting,
    listTrustedNerModels,
    nerRulesError,
  });

  const columns: Array<EuiBasicTableColumn<NerRule>> = [
    {
      field: 'modelId',
      name: (
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {i18n.translate('anonymizationUi.profiles.nerRules.header.modelId', {
              defaultMessage: 'NER model id',
            })}
          </EuiTextColor>
        </EuiText>
      ),
      render: (_value: string, rule: NerRule) => {
        const isInvalid = showValidationErrors && !rule.modelId.trim();
        if (usesTrustedNerModelProvider) {
          return (
            <EuiSelect
              compressed
              isInvalid={isInvalid}
              aria-label={i18n.translate(
                'anonymizationUi.profiles.nerRules.modelIdSelectAriaLabel',
                {
                  defaultMessage: 'Select a trusted NER model for rule {id}',
                  values: { id: rule.id },
                }
              )}
              options={getModelOptionsForRule(rule.modelId)}
              value={rule.modelId}
              onChange={(event) => updateRuleModelId(rule.id, event.target.value)}
              disabled={isNerInputDisabled}
              fullWidth
            />
          );
        }

        return (
          <EuiFieldText
            compressed
            value={rule.modelId}
            isInvalid={isInvalid}
            aria-label={i18n.translate('anonymizationUi.profiles.nerRules.row.modelIdAriaLabel', {
              defaultMessage: 'NER model id for rule {id}',
              values: { id: rule.id },
            })}
            onChange={(event) => updateRuleModelId(rule.id, event.target.value)}
            disabled={isNerInputDisabled}
            placeholder={i18n.translate('anonymizationUi.profiles.nerRules.modelIdPlaceholder', {
              defaultMessage: 'NER model id',
            })}
            fullWidth
          />
        );
      },
    },
    {
      field: 'allowedEntityClasses',
      name: (
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {i18n.translate('anonymizationUi.profiles.nerRules.header.allowedEntities', {
              defaultMessage: 'Allowed entities',
            })}
          </EuiTextColor>
        </EuiText>
      ),
      width: '220px',
      render: (_value: string[], rule: NerRule) => {
        const isInvalid =
          showValidationErrors &&
          (rule.allowedEntityClasses.length === 0 ||
            rule.allowedEntityClasses.some((entity) => !entity.trim()));
        return (
          <EuiFieldText
            compressed
            value={toAllowedEntitiesCsv(rule.allowedEntityClasses)}
            isInvalid={isInvalid}
            aria-label={i18n.translate(
              'anonymizationUi.profiles.nerRules.row.allowedEntitiesAriaLabel',
              {
                defaultMessage: 'Allowed entities for NER rule {id}',
                values: { id: rule.id },
              }
            )}
            onChange={(event) => updateRuleAllowedEntityClasses(rule.id, event.target.value)}
            disabled={isNerInputDisabled}
            placeholder={i18n.translate(
              'anonymizationUi.profiles.nerRules.allowedEntitiesPlaceholder',
              {
                defaultMessage: 'Allowed entities (comma separated)',
              }
            )}
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
            {i18n.translate('anonymizationUi.profiles.nerRules.header.state', {
              defaultMessage: 'State',
            })}
          </EuiTextColor>
        </EuiText>
      ),
      width: '180px',
      render: (_value: boolean, rule: NerRule) => (
        <EuiButtonGroup
          legend={i18n.translate('anonymizationUi.profiles.nerRules.stateLegend', {
            defaultMessage: 'NER rule state for {id}',
            values: { id: rule.id },
          })}
          options={[
            {
              id: NER_RULE_STATE_ENABLED,
              label: i18n.translate('anonymizationUi.profiles.nerRules.enabledLabel', {
                defaultMessage: 'Enabled',
              }),
            },
            {
              id: NER_RULE_STATE_DISABLED,
              label: i18n.translate('anonymizationUi.profiles.nerRules.disabledLabel', {
                defaultMessage: 'Disabled',
              }),
            },
          ]}
          idSelected={rule.enabled ? NER_RULE_STATE_ENABLED : NER_RULE_STATE_DISABLED}
          onChange={(value) => updateRuleEnabled(rule.id, value === NER_RULE_STATE_ENABLED)}
          buttonSize="compressed"
          isDisabled={isNerInputDisabled}
          type="single"
        />
      ),
    },
    {
      name: (
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {i18n.translate('anonymizationUi.profiles.nerRules.header.actions', {
              defaultMessage: 'Actions',
            })}
          </EuiTextColor>
        </EuiText>
      ),
      width: '50px',
      actions: [
        {
          name: i18n.translate('anonymizationUi.profiles.nerRules.removeButton', {
            defaultMessage: 'Remove',
          }),
          description: i18n.translate('anonymizationUi.profiles.nerRules.removeButton', {
            defaultMessage: 'Remove',
          }),
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          enabled: () => !isNerInputDisabled,
          onClick: (rule: NerRule) => {
            removeNerRuleById(rule.id);
          },
          'data-test-subj': 'anonymizationProfilesNerRuleRemove',
        },
      ],
    },
  ];

  return (
    <>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('anonymizationUi.profiles.nerRules.title', {
            defaultMessage: 'NER rules',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      {trustedNerModelsError && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={trustedNerModelsError}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {usesTrustedNerModelProvider && !isTrustedNerModelsLoading && !hasTrustedNerModel && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            title={i18n.translate('anonymizationUi.profiles.nerRules.noTrustedModelTitle', {
              defaultMessage: 'No trusted NER model available. NER rules are unavailable.',
            })}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {nerRulesError ? (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            iconType="warning"
            title={nerRulesError}
            size="s"
          />
          <EuiSpacer size="s" />
        </>
      ) : null}

      <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('anonymizationUi.profiles.nerRules.create.modelIdLabel', {
              defaultMessage: 'NER model id',
            })}
            fullWidth
          >
            {usesTrustedNerModelProvider ? (
              <EuiSelect
                compressed
                aria-label={i18n.translate(
                  'anonymizationUi.profiles.nerRules.create.modelIdAriaLabel',
                  {
                    defaultMessage: 'New NER model id',
                  }
                )}
                options={[
                  {
                    value: '',
                    text: i18n.translate(
                      'anonymizationUi.profiles.nerRules.modelIdSelectPlaceholder',
                      {
                        defaultMessage: 'Select a trusted NER model',
                      }
                    ),
                  },
                  ...trustedNerModelOptions,
                ]}
                value={nerDraft.modelId}
                onChange={(event) => setNerDraftModelId(event.target.value)}
                disabled={isNerInputDisabled}
                fullWidth
              />
            ) : (
              <EuiFieldText
                compressed
                value={nerDraft.modelId}
                aria-label={i18n.translate(
                  'anonymizationUi.profiles.nerRules.create.modelIdAriaLabel',
                  {
                    defaultMessage: 'New NER model id',
                  }
                )}
                onChange={(event) => setNerDraftModelId(event.target.value)}
                placeholder={i18n.translate(
                  'anonymizationUi.profiles.nerRules.modelIdPlaceholder',
                  {
                    defaultMessage: 'NER model id',
                  }
                )}
                disabled={isNerInputDisabled}
                fullWidth
              />
            )}
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 220 }}>
          <EuiFormRow
            label={i18n.translate('anonymizationUi.profiles.nerRules.create.allowedEntitiesLabel', {
              defaultMessage: 'Allowed entities',
            })}
            fullWidth
          >
            <EuiFieldText
              compressed
              value={nerDraft.allowedEntityClasses}
              aria-label={i18n.translate(
                'anonymizationUi.profiles.nerRules.create.allowedEntitiesAriaLabel',
                {
                  defaultMessage: 'New allowed entities',
                }
              )}
              onChange={(event) => setNerDraftAllowedEntities(event.target.value)}
              placeholder={i18n.translate(
                'anonymizationUi.profiles.nerRules.allowedEntitiesPlaceholder',
                {
                  defaultMessage: 'Allowed entities (comma separated)',
                }
              )}
              disabled={isNerInputDisabled}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={addNerRule} isDisabled={!canAddRule}>
            {i18n.translate('anonymizationUi.profiles.nerRules.addButton', {
              defaultMessage: 'Add NER',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {nerRules.length === 0 ? (
        <EuiCallOut
          announceOnMount
          color="primary"
          iconType="info"
          title={i18n.translate('anonymizationUi.profiles.nerRules.emptyStateTitle', {
            defaultMessage: 'No NER rules configured',
          })}
          data-test-subj="anonymizationProfilesNerRulesEmptyState"
        >
          <p>
            {i18n.translate('anonymizationUi.profiles.nerRules.emptyStateDescription', {
              defaultMessage:
                'Use NER rules to detect named entities with a trusted model and allow only selected entity classes.',
            })}
          </p>
          <p>
            {i18n.translate('anonymizationUi.profiles.nerRules.emptyStateHint', {
              defaultMessage:
                'Add a model id, list allowed entity classes (for example PER,ORG,LOC), and keep the rule enabled.',
            })}
          </p>
        </EuiCallOut>
      ) : (
        <EuiBasicTable
          tableCaption={i18n.translate('anonymizationUi.profiles.nerRules.tableCaption', {
            defaultMessage: 'NER rules',
          })}
          items={nerRules}
          columns={columns}
          compressed
          data-test-subj="anonymizationProfilesNerRulesTable"
        />
      )}
    </>
  );
};
