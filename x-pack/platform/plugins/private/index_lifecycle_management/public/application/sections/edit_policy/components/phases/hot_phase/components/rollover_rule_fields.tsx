/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldNumber,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiToolTip,
  type EuiFieldNumberProps,
} from '@elastic/eui';

import {
  getFieldValidityAndErrorMessage,
  useFormContext,
  useFormData,
} from '../../../../../../../shared_imports';
import { UseField } from '../../../../form';
import {
  byteSizeUnits,
  DEFAULT_ROLLOVER_TRIGGER_FIELDS,
  ROLLOVER_FIELD_PATHS,
  ROLLOVER_FORM_PATHS,
  ROLLOVER_RESTRICTION_FIELD_PATH,
  ROLLOVER_RESTRICTION_FIELDS,
  ROLLOVER_TRIGGER_FIELD_PATH,
  ROLLOVER_TRIGGER_FIELDS,
  timeUnits,
  type RolloverField,
  type RolloverRestrictionField,
  type RolloverTriggerField,
} from '../../../../constants';
import { i18nTexts } from '../../../../i18n_texts';
import {
  hasRecommendedRolloverDefaults,
  recommendedRolloverFormValues,
} from '../../../../../../lib';
import { UnitField } from '../../shared_fields/unit_field';

interface RolloverFieldConfig {
  menuLabel: string;
  path: string;
  testSubject: string;
  unitPath?: string;
  unitTestSubject?: string;
  unitAriaLabel?: string;
  unitOptions?: Array<{ value: string; text: string }>;
  deprecationMessage?: string;
}

const menuLabels = {
  age: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.rolloverMenu.ageLabel', {
    defaultMessage: 'Age',
  }),
  docs: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.rolloverMenu.documentsLabel', {
    defaultMessage: 'Documents',
  }),
  indexSize: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.rolloverMenu.indexSizeLabel', {
    defaultMessage: 'Index size',
  }),
  primaryShardDocs: i18n.translate(
    'xpack.indexLifecycleMgmt.hotPhase.rolloverMenu.primaryShardDocumentsLabel',
    {
      defaultMessage: 'Primary shard documents',
    }
  ),
  primaryShardSize: i18n.translate(
    'xpack.indexLifecycleMgmt.hotPhase.rolloverMenu.primaryShardSizeLabel',
    {
      defaultMessage: 'Primary shard size',
    }
  ),
};

const indexSizeDeprecationMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.hotPhase.indexSizeDeprecationMessage',
  {
    defaultMessage:
      'The index size trigger is deprecated and will be removed in a future version. Use primary shard size instead.',
  }
);

const triggerFirstConditionLabel = i18n.translate(
  'xpack.indexLifecycleMgmt.hotPhase.rolloverTriggerFirstConditionLabel',
  {
    defaultMessage: 'when',
  }
);

const triggerAdditionalConditionLabel = i18n.translate(
  'xpack.indexLifecycleMgmt.hotPhase.rolloverTriggerAdditionalConditionLabel',
  {
    defaultMessage: 'or',
  }
);

const restrictionFirstConditionLabel = i18n.translate(
  'xpack.indexLifecycleMgmt.hotPhase.rolloverRestrictionFirstConditionLabel',
  {
    defaultMessage: 'until',
  }
);

const restrictionAdditionalConditionLabel = i18n.translate(
  'xpack.indexLifecycleMgmt.hotPhase.rolloverRestrictionAdditionalConditionLabel',
  {
    defaultMessage: 'and',
  }
);

const rolloverFieldConfig: Record<RolloverField, RolloverFieldConfig> = {
  max_age: {
    menuLabel: menuLabels.age,
    path: ROLLOVER_FORM_PATHS.maxAge,
    testSubject: 'hot-selectedMaxAge',
    unitPath: '_meta.hot.customRollover.maxAgeUnit',
    unitTestSubject: 'hot-selectedMaxAgeUnits',
    unitAriaLabel: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.maximumAgeUnitsAriaLabel', {
      defaultMessage: 'Maximum age units',
    }),
    unitOptions: timeUnits,
  },
  max_docs: {
    menuLabel: menuLabels.docs,
    path: ROLLOVER_FORM_PATHS.maxDocs,
    testSubject: 'hot-selectedMaxDocuments',
  },
  max_size: {
    menuLabel: menuLabels.indexSize,
    path: ROLLOVER_FORM_PATHS.maxSize,
    testSubject: 'hot-selectedMaxSizeStored',
    unitPath: '_meta.hot.customRollover.maxStorageSizeUnit',
    unitTestSubject: 'hot-selectedMaxSizeStoredUnits',
    unitAriaLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.hotPhase.maximumIndexSizeUnitsAriaLabel',
      {
        defaultMessage: 'Maximum index size units',
      }
    ),
    unitOptions: byteSizeUnits,
    deprecationMessage: indexSizeDeprecationMessage,
  },
  max_primary_shard_docs: {
    menuLabel: menuLabels.primaryShardDocs,
    path: ROLLOVER_FORM_PATHS.maxPrimaryShardDocs,
    testSubject: 'hot-selectedMaxPrimaryShardDocs',
  },
  max_primary_shard_size: {
    menuLabel: menuLabels.primaryShardSize,
    path: ROLLOVER_FORM_PATHS.maxPrimaryShardSize,
    testSubject: 'hot-selectedMaxPrimaryShardSize',
    unitPath: '_meta.hot.customRollover.maxPrimaryShardSizeUnit',
    unitTestSubject: 'hot-selectedMaxPrimaryShardSizeUnits',
    unitAriaLabel: i18nTexts.editPolicy.maxPrimaryShardSizeUnitsLabel,
    unitOptions: byteSizeUnits,
  },
  min_age: {
    menuLabel: menuLabels.age,
    path: 'phases.hot.actions.rollover.min_age',
    testSubject: 'hot-selectedMinAge',
    unitPath: '_meta.hot.customRollover.minAgeUnit',
    unitTestSubject: 'hot-selectedMinAgeUnits',
    unitAriaLabel: i18n.translate('xpack.indexLifecycleMgmt.hotPhase.minimumAgeUnitsAriaLabel', {
      defaultMessage: 'Minimum age units',
    }),
    unitOptions: timeUnits,
  },
  min_docs: {
    menuLabel: menuLabels.docs,
    path: 'phases.hot.actions.rollover.min_docs',
    testSubject: 'hot-selectedMinDocuments',
  },
  min_size: {
    menuLabel: menuLabels.indexSize,
    path: 'phases.hot.actions.rollover.min_size',
    testSubject: 'hot-selectedMinSizeStored',
    unitPath: '_meta.hot.customRollover.minStorageSizeUnit',
    unitTestSubject: 'hot-selectedMinSizeStoredUnits',
    unitAriaLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.hotPhase.minimumIndexSizeUnitsAriaLabel',
      {
        defaultMessage: 'Minimum index size units',
      }
    ),
    unitOptions: byteSizeUnits,
  },
  min_primary_shard_docs: {
    menuLabel: menuLabels.primaryShardDocs,
    path: 'phases.hot.actions.rollover.min_primary_shard_docs',
    testSubject: 'hot-selectedMinPrimaryShardDocs',
  },
  min_primary_shard_size: {
    menuLabel: menuLabels.primaryShardSize,
    path: 'phases.hot.actions.rollover.min_primary_shard_size',
    testSubject: 'hot-selectedMinPrimaryShardSize',
    unitPath: '_meta.hot.customRollover.minPrimaryShardSizeUnit',
    unitTestSubject: 'hot-selectedMinPrimaryShardSizeUnits',
    unitAriaLabel: i18n.translate(
      'xpack.indexLifecycleMgmt.hotPhase.minimumPrimaryShardSizeUnitsAriaLabel',
      {
        defaultMessage: 'Minimum primary shard size units',
      }
    ),
    unitOptions: byteSizeUnits,
  },
};

interface AddRuleButtonProps<T extends RolloverField> {
  activeFields: T[];
  addButtonLabel: string;
  allFieldsInUseMessage: string;
  allFields: T[];
  dataTestSubj: string;
  onAdd: (field: T) => void;
}

const AddRuleButton = <T extends RolloverField>({
  activeFields,
  addButtonLabel,
  allFieldsInUseMessage,
  allFields,
  dataTestSubj,
  onAdd,
}: AddRuleButtonProps<T>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const availableFields = allFields.filter((field) => !activeFields.includes(field));

  if (availableFields.length === 0) {
    return (
      <EuiToolTip content={allFieldsInUseMessage}>
        <EuiButton iconType="arrowDown" iconSide="right" isDisabled data-test-subj={dataTestSubj}>
          {addButtonLabel}
        </EuiButton>
      </EuiToolTip>
    );
  }

  return (
    <EuiPopover
      aria-label={addButtonLabel}
      button={
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
          data-test-subj={dataTestSubj}
        >
          {addButtonLabel}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={availableFields.map((field) => (
          <EuiContextMenuItem
            key={field}
            onClick={() => {
              onAdd(field);
              setIsPopoverOpen(false);
            }}
            data-test-subj={`rolloverAddField-${field}`}
          >
            {rolloverFieldConfig[field].menuLabel}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};

interface RolloverRuleRowProps<T extends RolloverField> {
  field: T;
  conditionLabel: string;
  disableRemove: boolean;
  removeDisabledReason?: string;
  onRemove: (field: T) => void;
}

const RolloverRuleRow = <T extends RolloverField>({
  field,
  conditionLabel,
  disableRemove,
  removeDisabledReason,
  onRemove,
}: RolloverRuleRowProps<T>) => {
  const config = rolloverFieldConfig[field];
  const removeButton = (
    <EuiToolTip
      content={i18n.translate('xpack.indexLifecycleMgmt.hotPhase.removeRolloverRuleLabel', {
        defaultMessage: 'Remove rollover rule',
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        aria-label={i18n.translate('xpack.indexLifecycleMgmt.hotPhase.removeRolloverRuleLabel', {
          defaultMessage: 'Remove rollover rule',
        })}
        color="danger"
        iconType="cross"
        isDisabled={disableRemove}
        onClick={() => onRemove(field)}
        data-test-subj={`rolloverRemoveField-${field}`}
      />
    </EuiToolTip>
  );
  const conditionPrefix = (
    <span style={{ alignSelf: 'center', fontSize: 12, textAlign: 'right' }}>{conditionLabel}</span>
  );
  const fieldNamePrefix = (
    <span
      style={{
        alignItems: 'center',
        display: 'inline-flex',
        gap: 4,
        maxWidth: 188,
        whiteSpace: 'nowrap',
      }}
    >
      {config.deprecationMessage && (
        <EuiIconTip
          type="warning"
          aria-label={config.deprecationMessage}
          content={config.deprecationMessage}
          disableScreenReaderOutput
        />
      )}
      {config.menuLabel} &ge;
    </span>
  );

  return (
    <div
      style={{
        alignItems: 'start',
        columnGap: 8,
        display: 'grid',
        gridTemplateColumns: '28px minmax(0, 1fr) 24px',
      }}
    >
      {conditionPrefix}
      <UseField path={config.path}>
        {(formField) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(formField);

          return (
            <EuiFormRow fullWidth isInvalid={isInvalid} error={errorMessage}>
              <EuiFieldNumber
                isInvalid={isInvalid}
                value={formField.value as EuiFieldNumberProps['value']}
                onChange={formField.onChange}
                isLoading={formField.isValidating}
                fullWidth
                data-test-subj={config.testSubject}
                min={1}
                prepend={fieldNamePrefix}
                append={
                  config.unitPath && config.unitOptions ? (
                    <UnitField
                      path={config.unitPath}
                      options={config.unitOptions}
                      euiFieldProps={{
                        'data-test-subj': config.unitTestSubject,
                        'aria-label': config.unitAriaLabel,
                      }}
                    />
                  ) : undefined
                }
              />
            </EuiFormRow>
          );
        }}
      </UseField>
      <div style={{ marginTop: 8 }}>
        {disableRemove && removeDisabledReason ? (
          <EuiToolTip content={removeDisabledReason}>{removeButton}</EuiToolTip>
        ) : (
          removeButton
        )}
      </div>
    </div>
  );
};

interface RolloverFieldSectionProps<T extends RolloverField> {
  title: string;
  activeFieldPath: string;
  allFields: T[];
  addButtonLabel: string;
  allFieldsInUseMessage: string;
  addButtonTestSubj: string;
  firstConditionLabel: string;
  additionalConditionLabel: string;
  isTriggerSection?: boolean;
}

const RolloverFieldSection = <T extends RolloverField>({
  title,
  activeFieldPath,
  allFields,
  addButtonLabel,
  allFieldsInUseMessage,
  addButtonTestSubj,
  firstConditionLabel,
  additionalConditionLabel,
  isTriggerSection = false,
}: RolloverFieldSectionProps<T>) => {
  const { setFieldValue } = useFormContext();

  return (
    <UseField<T[]> path={activeFieldPath}>
      {(activeField) => {
        const activeFields = activeField.value ?? [];
        const setActiveFields = (fields: T[]) => activeField.setValue(fields);
        const onRemove = (field: T) => {
          setFieldValue(ROLLOVER_FIELD_PATHS[field], undefined);
          setActiveFields(activeFields.filter((active) => active !== field));
        };

        return (
          <>
            <h4 style={{ fontWeight: 700, marginBottom: 8 }}>{title}...</h4>

            <EuiPanel hasShadow={false} hasBorder={false} color="subdued" paddingSize="s">
              {activeFields.map((field, index) => (
                <div key={field} style={{ marginBottom: 8 }}>
                  <RolloverRuleRow
                    field={field}
                    conditionLabel={index === 0 ? firstConditionLabel : additionalConditionLabel}
                    disableRemove={isTriggerSection && activeFields.length === 1}
                    removeDisabledReason={i18n.translate(
                      'xpack.indexLifecycleMgmt.hotPhase.lastRolloverTriggerRemoveDisabled',
                      {
                        defaultMessage: 'At least one trigger is required.',
                      }
                    )}
                    onRemove={onRemove}
                  />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)' }}>
                <span />
                <div>
                  <AddRuleButton
                    activeFields={activeFields}
                    addButtonLabel={addButtonLabel}
                    allFieldsInUseMessage={allFieldsInUseMessage}
                    allFields={allFields}
                    dataTestSubj={addButtonTestSubj}
                    onAdd={(field) => setActiveFields([...activeFields, field])}
                  />
                </div>
              </div>
            </EuiPanel>
          </>
        );
      }}
    </UseField>
  );
};

export const RolloverTriggerFields: FunctionComponent = () => (
  <RolloverFieldSection<RolloverTriggerField>
    title={i18nTexts.editPolicy.triggerRolloverLabel}
    activeFieldPath={ROLLOVER_TRIGGER_FIELD_PATH}
    allFields={ROLLOVER_TRIGGER_FIELDS}
    addButtonLabel={i18nTexts.editPolicy.addRolloverTriggerLabel}
    addButtonTestSubj="rolloverAddTriggerButton"
    allFieldsInUseMessage={i18nTexts.editPolicy.allRolloverTriggersInUseLabel}
    firstConditionLabel={triggerFirstConditionLabel}
    additionalConditionLabel={triggerAdditionalConditionLabel}
    isTriggerSection
  />
);

export const RolloverRestrictionFields: FunctionComponent = () => (
  <RolloverFieldSection<RolloverRestrictionField>
    title={i18nTexts.editPolicy.restrictRolloverLabel}
    activeFieldPath={ROLLOVER_RESTRICTION_FIELD_PATH}
    allFields={ROLLOVER_RESTRICTION_FIELDS}
    addButtonLabel={i18nTexts.editPolicy.addRolloverRestrictionLabel}
    addButtonTestSubj="rolloverAddRestrictionButton"
    allFieldsInUseMessage={i18nTexts.editPolicy.allRolloverRestrictionsInUseLabel}
    firstConditionLabel={restrictionFirstConditionLabel}
    additionalConditionLabel={restrictionAdditionalConditionLabel}
  />
);

const RolloverRecommendedDefaultsButton: FunctionComponent = () => {
  const { setFieldValue } = useFormContext();
  const [formData] = useFormData({
    watch: [
      ROLLOVER_TRIGGER_FIELD_PATH,
      ROLLOVER_FORM_PATHS.maxAge,
      ROLLOVER_FORM_PATHS.maxPrimaryShardSize,
      '_meta.hot.customRollover.maxAgeUnit',
      '_meta.hot.customRollover.maxPrimaryShardSizeUnit',
    ],
  });
  const isUsingRecommendedDefaults = useMemo(
    () =>
      hasRecommendedRolloverDefaults({
        rollover: get(formData, 'phases.hot.actions.rollover'),
        triggerFields: get(formData, ROLLOVER_TRIGGER_FIELD_PATH),
        maxAgeUnit: get(formData, '_meta.hot.customRollover.maxAgeUnit'),
        maxPrimaryShardSizeUnit: get(formData, '_meta.hot.customRollover.maxPrimaryShardSizeUnit'),
      }),
    [formData]
  );

  return (
    <EuiButtonEmpty
      flush="left"
      size="xs"
      isDisabled={isUsingRecommendedDefaults}
      onClick={() => {
        setFieldValue(ROLLOVER_TRIGGER_FIELD_PATH, DEFAULT_ROLLOVER_TRIGGER_FIELDS);
        setFieldValue(ROLLOVER_FORM_PATHS.maxAge, recommendedRolloverFormValues.max_age);
        setFieldValue(
          ROLLOVER_FORM_PATHS.maxPrimaryShardSize,
          recommendedRolloverFormValues.max_primary_shard_size
        );
        setFieldValue(
          '_meta.hot.customRollover.maxAgeUnit',
          recommendedRolloverFormValues.maxAgeUnit
        );
        setFieldValue(
          '_meta.hot.customRollover.maxPrimaryShardSizeUnit',
          recommendedRolloverFormValues.maxPrimaryShardSizeUnit
        );
      }}
      data-test-subj="rolloverRestoreRecommendedDefaults"
    >
      {i18nTexts.editPolicy.restoreRecommendedRolloverDefaultsLabel}
    </EuiButtonEmpty>
  );
};

export const RolloverFields: FunctionComponent = () => (
  <>
    <RolloverTriggerFields />
    <EuiSpacer size="s" />
    <RolloverRestrictionFields />
    <EuiSpacer size="xs" />
    <RolloverRecommendedDefaultsButton />
  </>
);
