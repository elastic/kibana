/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FakeEntityType } from '../fake_entity_types';
import type {
  CustomLinkDraft,
  FilterCondition,
  FilterOperator,
  FlyoutTabConfig,
  HealthSignals,
  OwnershipConfig,
  SubsetDraft,
} from './fake_entity_type_draft';
import { buildBlankFilterCondition } from './fake_entity_type_draft';
import { OwnershipForm } from './steps/ownership_step';
import { FlyoutTabsList } from './steps/flyout_content_step';

const OPERATOR_OPTIONS: ReadonlyArray<{ value: FilterOperator; text: string }> = [
  {
    value: 'equals',
    text: i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.operatorEquals', {
      defaultMessage: '= equals to',
    }),
  },
  {
    value: 'notEquals',
    text: i18n.translate(
      'xpack.streams.entityCentricLab.editFlyout.subsetEditor.operatorNotEquals',
      { defaultMessage: '!= not equals to' }
    ),
  },
  {
    value: 'contains',
    text: i18n.translate(
      'xpack.streams.entityCentricLab.editFlyout.subsetEditor.operatorContains',
      { defaultMessage: 'contains' }
    ),
  },
  {
    value: 'exists',
    text: i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.operatorExists', {
      defaultMessage: 'exists',
    }),
  },
];

const FIELD_SUGGESTIONS = [
  '',
  'service.name',
  'service.environment',
  'host.name',
  'host.os.platform',
  'kubernetes.namespace',
  'aws.region',
];

const VALUE_SUGGESTIONS = ['', 'production', 'staging', 'myService', 'us-east-1'];

interface SubsetEditorBodyProps {
  readonly entityType: FakeEntityType;
  readonly subset: SubsetDraft;
  readonly onChange: (next: SubsetDraft) => void;
}

export const SubsetEditorBody = ({ entityType, subset, onChange }: SubsetEditorBodyProps) => {
  const detailsAccordionId = useGeneratedHtmlId({ prefix: 'subsetDetails' });
  const filterAccordionId = useGeneratedHtmlId({ prefix: 'subsetFilter' });

  const updateFilter = useCallback(
    (next: FilterCondition[]) => {
      onChange({ ...subset, filter: next });
    },
    [onChange, subset]
  );

  const updateCondition = useCallback(
    (conditionId: string, patch: Partial<FilterCondition>) => {
      updateFilter(
        subset.filter.map((condition) =>
          condition.id === conditionId ? { ...condition, ...patch } : condition
        )
      );
    },
    [subset.filter, updateFilter]
  );

  const removeCondition = useCallback(
    (conditionId: string) => {
      updateFilter(subset.filter.filter((condition) => condition.id !== conditionId));
    },
    [subset.filter, updateFilter]
  );

  const addCondition = useCallback(() => {
    updateFilter([...subset.filter, buildBlankFilterCondition()]);
  }, [subset.filter, updateFilter]);

  const updateHealthSignals = useCallback(
    (next: HealthSignals) => {
      onChange({
        ...subset,
        healthOverride: { ...subset.healthOverride, signals: next },
      });
    },
    [onChange, subset]
  );

  const updateOwnershipConfig = useCallback(
    (next: OwnershipConfig) => {
      onChange({
        ...subset,
        ownershipOverride: { ...subset.ownershipOverride, ownership: next },
      });
    },
    [onChange, subset]
  );

  const updateFlyoutTabs = useCallback(
    (next: FlyoutTabConfig[]) => {
      onChange({
        ...subset,
        contentOverride: { ...subset.contentOverride, flyoutTabs: next },
      });
    },
    [onChange, subset]
  );

  const updateCustomLinks = useCallback(
    (next: CustomLinkDraft[]) => {
      onChange({
        ...subset,
        contentOverride: { ...subset.contentOverride, customLinks: next },
      });
    },
    [onChange, subset]
  );

  return (
    <div data-test-subj="entityCentricLabEditFlyoutSubsetEditorBody">
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.intro', {
            defaultMessage:
              'You can define subsets of entity types that override entity type settings.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiAccordion
        id={detailsAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.subsetEditor.detailsTitle',
                { defaultMessage: 'Subset details' }
              )}
            </h3>
          </EuiTitle>
        }
        paddingSize="m"
      >
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.subsetEditor.nameLabel',
            { defaultMessage: 'Name' }
          )}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            placeholder={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.subsetEditor.namePlaceholder',
              { defaultMessage: 'Name for your subset' }
            )}
            value={subset.name}
            onChange={(event) => onChange({ ...subset, name: event.target.value })}
            data-test-subj="entityCentricLabEditFlyoutSubsetEditorName"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.subsetEditor.descriptionLabel',
            { defaultMessage: 'Description - optional' }
          )}
          fullWidth
        >
          <EuiTextArea
            fullWidth
            rows={3}
            placeholder={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.subsetEditor.descriptionPlaceholder',
              { defaultMessage: 'Description for your subset' }
            )}
            value={subset.description}
            onChange={(event) => onChange({ ...subset, description: event.target.value })}
            data-test-subj="entityCentricLabEditFlyoutSubsetEditorDescription"
          />
        </EuiFormRow>
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={filterAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.subsetEditor.filterTitle',
                { defaultMessage: 'Filter' }
              )}
            </h3>
          </EuiTitle>
        }
        paddingSize="m"
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          {subset.filter.map((condition) => (
            <EuiFlexItem key={condition.id} grow={false}>
              <ConditionRow
                condition={condition}
                onUpdate={(patch) => updateCondition(condition.id, patch)}
                onRemove={() => removeCondition(condition.id)}
                disableRemove={subset.filter.length === 1}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          iconType="plusInCircle"
          onClick={addCondition}
          data-test-subj="entityCentricLabEditFlyoutSubsetEditorAddCondition"
        >
          {i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.subsetEditor.addConditionButton',
            { defaultMessage: 'Add condition' }
          )}
        </EuiButtonEmpty>
      </EuiAccordion>

      <EuiSpacer size="m" />

      <OverrideAccordion
        title={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthTitle',
          { defaultMessage: 'Health overrides' }
        )}
        enabled={subset.healthOverride.enabled}
        onToggleEnabled={(enabled) =>
          onChange({
            ...subset,
            healthOverride: { ...subset.healthOverride, enabled },
          })
        }
        toggleAriaLabel={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthOverrideAriaLabel',
          { defaultMessage: 'Override health settings' }
        )}
        disabledHint={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthDisabledHint',
          {
            defaultMessage:
              'This subset inherits the entity-type health settings. Toggle the switch to override them.',
          }
        )}
        dataTestSubj="entityCentricLabEditFlyoutSubsetEditorHealthOverride"
      >
        <HealthOverrideBody
          signals={subset.healthOverride.signals}
          onChange={updateHealthSignals}
        />
      </OverrideAccordion>

      <EuiSpacer size="m" />

      <OverrideAccordion
        title={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.subsetEditor.ownershipTitle',
          { defaultMessage: 'Ownership overrides' }
        )}
        enabled={subset.ownershipOverride.enabled}
        onToggleEnabled={(enabled) =>
          onChange({
            ...subset,
            ownershipOverride: { ...subset.ownershipOverride, enabled },
          })
        }
        toggleAriaLabel={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.subsetEditor.ownershipOverrideAriaLabel',
          { defaultMessage: 'Override ownership settings' }
        )}
        disabledHint={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.subsetEditor.ownershipDisabledHint',
          {
            defaultMessage:
              'This subset inherits the entity-type ownership settings. Toggle the switch to override them.',
          }
        )}
        dataTestSubj="entityCentricLabEditFlyoutSubsetEditorOwnershipOverride"
      >
        <OwnershipForm
          ownership={subset.ownershipOverride.ownership}
          coveragePreview={subset.ownershipOverride.coveragePreview}
          onChange={updateOwnershipConfig}
          idPrefix={`subsetOwnership-${subset.id}`}
          testSubjPrefix="entityCentricLabEditFlyoutSubsetEditorOwnership"
        />
      </OverrideAccordion>

      <EuiSpacer size="m" />

      <OverrideAccordion
        title={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.subsetEditor.contentTitle',
          { defaultMessage: 'Content override' }
        )}
        enabled={subset.contentOverride.enabled}
        onToggleEnabled={(enabled) =>
          onChange({
            ...subset,
            contentOverride: { ...subset.contentOverride, enabled },
          })
        }
        toggleAriaLabel={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.subsetEditor.contentOverrideAriaLabel',
          { defaultMessage: 'Override content settings' }
        )}
        disabledHint={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.subsetEditor.contentDisabledHint',
          {
            defaultMessage:
              'This subset inherits the entity-type flyout content. Toggle the switch to override the tabs and their order.',
          }
        )}
        dataTestSubj="entityCentricLabEditFlyoutSubsetEditorContentOverride"
      >
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.contentIntro', {
              defaultMessage:
                'Re-order or toggle tabs for entities in this subset. Disabled tabs are hidden from the entity flyout.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <FlyoutTabsList
          tabs={subset.contentOverride.flyoutTabs}
          onChange={updateFlyoutTabs}
          droppableId={`entityCentricLabSubsetFlyoutTabsDroppable-${subset.id}`}
          testSubjPrefix="entityCentricLabEditFlyoutSubsetEditorContent"
          // `?? []` guards drafts persisted before `customLinks` existed
          // on `contentOverride` — the editor itself seeds a blank row
          // when the list is empty, so the user still gets a working
          // editor on legacy payloads.
          customLinks={subset.contentOverride.customLinks ?? []}
          onCustomLinksChange={updateCustomLinks}
        />
      </OverrideAccordion>

      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.contextHint', {
            defaultMessage:
              'Subset of "{entityTypeName}" — overrides apply only to entities matching the filter above.',
            values: { entityTypeName: entityType.name },
          })}
        </p>
      </EuiText>
    </div>
  );
};

interface OverrideAccordionProps {
  readonly title: string;
  readonly enabled: boolean;
  readonly onToggleEnabled: (enabled: boolean) => void;
  readonly toggleAriaLabel: string;
  readonly disabledHint: string;
  readonly dataTestSubj: string;
  readonly children: React.ReactNode;
}

/**
 * Override section accordion. The header switch in `extraAction` is the
 * source of truth for whether the override applies. Flipping it open or
 * closed also expands/collapses the accordion body, but the user remains
 * free to click the arrow to peek without changing the override state.
 */
const OverrideAccordion = ({
  title,
  enabled,
  onToggleEnabled,
  toggleAriaLabel,
  disabledHint,
  dataTestSubj,
  children,
}: OverrideAccordionProps) => {
  const accordionId = useGeneratedHtmlId({ prefix: dataTestSubj });
  const [forceState, setForceState] = useState<'open' | 'closed'>(enabled ? 'open' : 'closed');

  useEffect(() => {
    setForceState(enabled ? 'open' : 'closed');
  }, [enabled]);

  return (
    <EuiAccordion
      id={accordionId}
      forceState={forceState}
      onToggle={(isOpen) => setForceState(isOpen ? 'open' : 'closed')}
      buttonContent={
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      }
      extraAction={
        <EuiSwitch
          showLabel={false}
          label={toggleAriaLabel}
          checked={enabled}
          onChange={(event) => onToggleEnabled(event.target.checked)}
          data-test-subj={`${dataTestSubj}Toggle`}
        />
      }
      paddingSize="m"
      data-test-subj={dataTestSubj}
    >
      {enabled ? children : <OverrideDisabledHint hint={disabledHint} />}
    </EuiAccordion>
  );
};

const OverrideDisabledHint = ({ hint }: { hint: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="m"
      color="subdued"
      css={css`
        border: 1px dashed ${euiTheme.colors.borderBaseSubdued};
      `}
      data-test-subj="entityCentricLabEditFlyoutSubsetEditorOverrideDisabledHint"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="lock">
            {i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.subsetEditor.overrideDisabledBadge',
              { defaultMessage: 'Inherited' }
            )}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            <p>{hint}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

interface ConditionRowProps {
  readonly condition: FilterCondition;
  readonly onUpdate: (patch: Partial<FilterCondition>) => void;
  readonly onRemove: () => void;
  readonly disableRemove: boolean;
}

const ConditionRow = ({ condition, onUpdate, onRemove, disableRemove }: ConditionRowProps) => {
  const fieldOptions = useMemo(
    () => FIELD_SUGGESTIONS.map((field) => ({ value: field, text: field || '\u2014' })),
    []
  );
  const valueOptions = useMemo(
    () => VALUE_SUGGESTIONS.map((value) => ({ value, text: value || '\u2014' })),
    []
  );

  const ensureOption = (
    base: Array<{ value: string; text: string }>,
    current: string
  ): Array<{ value: string; text: string }> =>
    base.some((option) => option.value === current) || current === ''
      ? [...base]
      : [{ value: current, text: current }, ...base];

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.subsetEditor.fieldLabel',
            { defaultMessage: 'Field' }
          )}
          fullWidth
        >
          <EuiSelect
            fullWidth
            value={condition.field}
            options={ensureOption(fieldOptions, condition.field)}
            onChange={(event) => onUpdate({ field: event.target.value })}
            data-test-subj={`entityCentricLabEditFlyoutSubsetEditorField-${condition.id}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.subsetEditor.operatorLabel',
            { defaultMessage: 'Operator' }
          )}
        >
          <EuiSelect
            value={condition.operator}
            options={[...OPERATOR_OPTIONS]}
            onChange={(event) => onUpdate({ operator: event.target.value as FilterOperator })}
            data-test-subj={`entityCentricLabEditFlyoutSubsetEditorOperator-${condition.id}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.subsetEditor.valueLabel',
            { defaultMessage: 'Value' }
          )}
          fullWidth
        >
          <EuiSelect
            fullWidth
            disabled={condition.operator === 'exists'}
            value={condition.value}
            options={ensureOption(valueOptions, condition.value)}
            onChange={(event) => onUpdate({ value: event.target.value })}
            data-test-subj={`entityCentricLabEditFlyoutSubsetEditorValue-${condition.id}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            isDisabled={disableRemove}
            onClick={onRemove}
            aria-label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.subsetEditor.removeConditionAriaLabel',
              { defaultMessage: 'Remove condition' }
            )}
            data-test-subj={`entityCentricLabEditFlyoutSubsetEditorRemoveCondition-${condition.id}`}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface HealthOverrideBodyProps {
  readonly signals: HealthSignals;
  readonly onChange: (next: HealthSignals) => void;
}

const HealthOverrideBody = ({ signals, onChange }: HealthOverrideBodyProps) => {
  return (
    <div>
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthIntro', {
            defaultMessage:
              'Entity types have a glanceable health indicator. Choose which signals feed into this indicator.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="success">
            {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthyBadge', {
              defaultMessage: 'Healthy',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning">
            {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.atRiskBadge', {
              defaultMessage: 'At risk',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">
            {i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.subsetEditor.unhealthyBadge',
              { defaultMessage: 'Unhealthy' }
            )}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthActiveAlerts',
              { defaultMessage: 'Active alerts severity' }
            )}
            checked={signals.activeAlertsSeverity}
            onChange={(event) =>
              onChange({ ...signals, activeAlertsSeverity: event.target.checked })
            }
            data-test-subj="entityCentricLabEditFlyoutSubsetEditorHealthActiveAlerts"
          />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthActiveAlertsExplanation',
                {
                  defaultMessage: 'Critical alert: unhealthy, warning alert: at risk',
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthAvailableSignals',
              { defaultMessage: 'Available signals' }
            )}
            checked={signals.availableSignals}
            onChange={(event) => onChange({ ...signals, availableSignals: event.target.checked })}
            data-test-subj="entityCentricLabEditFlyoutSubsetEditorHealthAvailableSignals"
          />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthAvailableSignalsExplanation',
                {
                  defaultMessage:
                    'Roll up golden signals (latency, error rate, throughput) into the health indicator.',
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthSecuritySignals',
              { defaultMessage: 'Security signals' }
            )}
            checked={signals.securitySignals}
            onChange={(event) => onChange({ ...signals, securitySignals: event.target.checked })}
            data-test-subj="entityCentricLabEditFlyoutSubsetEditorHealthSecuritySignals"
          />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.subsetEditor.healthSecuritySignalsExplanation',
                {
                  defaultMessage:
                    'Open security issues with high or critical severity downgrade the indicator.',
                }
              )}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
