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
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiDescriptionList,
} from '@elastic/eui';
import {
  NER_ENTITY_CLASSES,
  NER_MODEL_ID,
  type NerEntityClass,
  type NerRule,
} from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import { useProfileFormContext } from '../../profile_form_context';
import { useNerRulesPanelState } from '../../hooks/use_ner_rules_panel_state';

const NER_RULE_STATE_ENABLED = 'enabled';
const NER_RULE_STATE_DISABLED = 'disabled';

const nerEntityClassOptions: Array<EuiComboBoxOptionOption<string>> = NER_ENTITY_CLASSES.map(
  (value) => ({
    label: value,
  })
);

const isNerEntityClass = (value: string): value is NerEntityClass =>
  NER_ENTITY_CLASSES.includes(value as NerEntityClass);

const toNerEntityClasses = (options: Array<EuiComboBoxOptionOption<string>>): NerEntityClass[] =>
  options.map((option) => option.label).filter(isNerEntityClass);

const toComboBoxOptions = (values: NerEntityClass[]): Array<EuiComboBoxOptionOption<string>> =>
  values.map((value) => ({ label: value }));

interface NerRulesTableProps {
  nerRules: NerRule[];
  showValidationErrors: boolean;
  hasSingleTrustedNerModel: boolean;
  singleTrustedNerModel?: { text: string };
  usesTrustedNerModelProvider: boolean;
  getModelOptionsForRule: (modelId: string) => Array<{ value: string; text: string }>;
  updateRuleModelId: (id: string, modelId: string) => void;
  updateRuleAllowedEntityClasses: (id: string, values: NerEntityClass[]) => void;
  updateRuleEnabled: (id: string, enabled: boolean) => void;
  isNerInputDisabled: boolean;
  removeNerRuleById: (id: string) => void;
}

const NerRulesTable = ({
  nerRules,
  showValidationErrors,
  hasSingleTrustedNerModel,
  singleTrustedNerModel,
  usesTrustedNerModelProvider,
  getModelOptionsForRule,
  updateRuleModelId,
  updateRuleAllowedEntityClasses,
  updateRuleEnabled,
  isNerInputDisabled,
  removeNerRuleById,
}: NerRulesTableProps) => {
  const columns: Array<EuiBasicTableColumn<NerRule>> = [
    {
      field: 'modelId',
      name: (
        <EuiText size="xs">
          <EuiTextColor color="subdued">
            {i18n.translate('anonymizationUi.profiles.nerRules.header.modelId', {
              defaultMessage: 'Model',
            })}
          </EuiTextColor>
        </EuiText>
      ),
      render: (_value: string, rule: NerRule) => {
        const modelId = rule.modelId ?? NER_MODEL_ID;
        const isInvalid = showValidationErrors && !modelId.trim();
        if (hasSingleTrustedNerModel && singleTrustedNerModel) {
          return (
            <EuiText size="s">
              <p>{singleTrustedNerModel.text}</p>
            </EuiText>
          );
        }
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
              options={getModelOptionsForRule(modelId)}
              value={modelId}
              onChange={(event) => updateRuleModelId(rule.id, event.target.value)}
              disabled={isNerInputDisabled}
              fullWidth
            />
          );
        }

        return (
          <EuiFieldText
            compressed
            value={modelId}
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
      render: (_value: NerEntityClass[], rule: NerRule) => {
        const isInvalid =
          showValidationErrors &&
          (rule.allowedEntityClasses.length === 0 ||
            rule.allowedEntityClasses.some((entity) => !entity.trim()));
        return (
          <EuiComboBox
            compressed
            selectedOptions={toComboBoxOptions(rule.allowedEntityClasses)}
            isInvalid={isInvalid}
            aria-label={i18n.translate(
              'anonymizationUi.profiles.nerRules.row.allowedEntitiesAriaLabel',
              {
                defaultMessage: 'Allowed entities for NER rule {id}',
                values: { id: rule.id },
              }
            )}
            options={nerEntityClassOptions}
            onChange={(options) =>
              updateRuleAllowedEntityClasses(rule.id, toNerEntityClasses(options))
            }
            singleSelection={false}
            isClearable
            isDisabled={isNerInputDisabled}
            placeholder={i18n.translate(
              'anonymizationUi.profiles.nerRules.allowedEntitiesPlaceholder',
              {
                defaultMessage: 'Select allowed entities',
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
    <EuiBasicTable
      tableCaption={i18n.translate('anonymizationUi.profiles.nerRules.tableCaption', {
        defaultMessage: 'NER rules',
      })}
      items={nerRules}
      columns={columns}
      compressed
      data-test-subj="anonymizationProfilesNerRulesTable"
    />
  );
};

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
    singleTrustedNerModel,
    trustedNerModelsError,
    isTrustedNerModelsLoading,
    usesTrustedNerModelProvider,
    hasSingleTrustedNerModel,
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
            label={
              hasSingleTrustedNerModel
                ? undefined
                : i18n.translate('anonymizationUi.profiles.nerRules.create.modelIdLabel', {
                    defaultMessage: 'Model id',
                  })
            }
            fullWidth
          >
            {hasSingleTrustedNerModel && singleTrustedNerModel ? (
              <EuiDescriptionList
                compressed
                listItems={[
                  {
                    title: i18n.translate(
                      'anonymizationUi.profiles.nerRules.singleTrustedModel.title',
                      {
                        defaultMessage: 'Trusted NER model',
                      }
                    ),
                    description: singleTrustedNerModel.text,
                  },
                ]}
              />
            ) : usesTrustedNerModelProvider ? (
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
              <EuiText size="s">
                <span data-test-subj="anonymizationProfilesNerRulesDefaultModelId">
                  {nerDraft.modelId}
                </span>
              </EuiText>
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
            <EuiComboBox
              compressed
              selectedOptions={toComboBoxOptions(nerDraft.allowedEntityClasses)}
              aria-label={i18n.translate(
                'anonymizationUi.profiles.nerRules.create.allowedEntitiesAriaLabel',
                {
                  defaultMessage: 'New allowed entities',
                }
              )}
              options={nerEntityClassOptions}
              onChange={(options) => setNerDraftAllowedEntities(toNerEntityClasses(options))}
              singleSelection={false}
              isClearable
              placeholder={i18n.translate(
                'anonymizationUi.profiles.nerRules.allowedEntitiesPlaceholder',
                {
                  defaultMessage: 'Select allowed entities',
                }
              )}
              isDisabled={isNerInputDisabled}
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
                'Use NER rules to detect named entities and allow only selected entity classes.',
            })}
          </p>
          <p>
            {i18n.translate('anonymizationUi.profiles.nerRules.emptyStateHint', {
              defaultMessage: hasSingleTrustedNerModel
                ? 'A trusted NER model is configured by default. Select allowed entity classes (for example PER, ORG, LOC), then add and enable the rule.'
                : 'Select a model id, choose allowed entity classes (for example PER, ORG, LOC), and keep the rule enabled.',
            })}
          </p>
        </EuiCallOut>
      ) : (
        <NerRulesTable
          nerRules={nerRules}
          showValidationErrors={showValidationErrors}
          hasSingleTrustedNerModel={hasSingleTrustedNerModel}
          singleTrustedNerModel={singleTrustedNerModel}
          usesTrustedNerModelProvider={usesTrustedNerModelProvider}
          getModelOptionsForRule={getModelOptionsForRule}
          updateRuleModelId={updateRuleModelId}
          updateRuleAllowedEntityClasses={updateRuleAllowedEntityClasses}
          updateRuleEnabled={updateRuleEnabled}
          isNerInputDisabled={isNerInputDisabled}
          removeNerRuleById={removeNerRuleById}
        />
      )}
    </>
  );
};
