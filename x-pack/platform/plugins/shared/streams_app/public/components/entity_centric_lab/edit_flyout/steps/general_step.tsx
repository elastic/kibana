/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityTypeDraft, GeneralFields } from '../fake_entity_type_draft';
import { FAKE_ENTITY_TYPES } from '../../fake_entity_types';
import { useUserEntityTypes } from '../../user_entity_types';
import { ENTITY_CATEGORIES } from '../../entities/fake_entities';

/** Sentinel value used by the category dropdown to mean "I want a new one". */
const CREATE_NEW_CATEGORY_SENTINEL = '__create_new_category__';
const CATEGORY_DIVIDER_SENTINEL = '__category_divider__';
const CATEGORY_EXTRAS_DIVIDER_SENTINEL = '__category_extras_divider__';

/**
 * Canonical, ordered category list shown in the dropdown — derived
 * straight from `ENTITY_CATEGORIES` so the wizard's options stay in
 * lock-step with the left-nav sections. `'other'` is filtered out
 * because users land in the Other bucket *implicitly* via
 * "+ Create new category" (any free-text label that doesn't match a
 * canonical category resolves to Other); offering it as an explicit
 * pick would be confusing. Additional categories pulled from seed
 * data or user-created entity types are still appended below a
 * divider so legacy / experimental labels stay reachable.
 */
const CANONICAL_CATEGORIES: readonly string[] = ENTITY_CATEGORIES.filter(
  (category) => category.id !== 'other'
).map((category) => category.label);

/**
 * Mock list of Elastic data streams the user can pick from. Curated to
 * cover the same surfaces as the `PRESETS` seed so a freshly-created
 * entity type can plausibly target any of them. The leading `''` entry
 * renders as the unselected placeholder.
 */
const DATA_STREAM_SUGGESTIONS: readonly string[] = [
  '',
  'metrics-kubernetes.state_cluster-*',
  'metrics-kubernetes.state_node-*',
  'metrics-kubernetes.state_pod-*',
  'metrics-apm.service_summary-*',
  'metrics-aws.ec2_metrics-*',
  'metrics-aws.lambda-*',
  'metrics-aws.s3-*',
  'logs-*',
  'traces-apm-*',
];

/**
 * Mock catalogue of identifier-field paths the user can pick from.
 * Covers the common ECS / APM / Kubernetes / cloud names so the
 * dropdown is plausible for every `PRESET`. Used as the union of every
 * per-stream list below, and as the unrestricted fallback when no data
 * stream is selected (or for generic streams like `logs-*`).
 */
const ALL_IDENTIFIER_FIELDS: readonly string[] = [
  'service.name',
  'service.environment',
  'agent.name',
  'host.name',
  'host.hostname',
  'container.id',
  'cluster.name',
  'orchestrator.cluster.name',
  'kubernetes.node.name',
  'kubernetes.node.uid',
  'kubernetes.pod.name',
  'kubernetes.pod.uid',
  'kubernetes.namespace',
  'kubernetes.deployment.name',
  'aws.ec2.instance.id',
  'aws.lambda.function_name',
  'aws.lambda.arn',
  'aws.s3.bucket.name',
  'aws.s3.bucket.arn',
  'cloud.instance.id',
  'cloud.account.id',
  'cloud.region',
];

/**
 * Per-data-stream filter applied to the identifier-field dropdown. Each
 * entry lists *only* the fields that genuinely identify the entity the
 * stream is about (name + alternate ids like UID / ARN), not every
 * field a document in that stream might carry. For example, a pod can
 * be identified by `kubernetes.pod.name` or `kubernetes.pod.uid`;
 * fields like `host.name` or `kubernetes.namespace` describe the pod's
 * context but don't identify the pod itself, so they're excluded.
 * Missing entries (e.g. `logs-*`) fall back to the full
 * {@link ALL_IDENTIFIER_FIELDS} list so the user keeps full freedom
 * where the stream is generic enough.
 */
const IDENTIFIER_FIELDS_BY_DATA_STREAM: Readonly<Record<string, readonly string[]>> = {
  'metrics-kubernetes.state_cluster-*': ['cluster.name', 'orchestrator.cluster.name'],
  'metrics-kubernetes.state_node-*': ['kubernetes.node.name', 'kubernetes.node.uid'],
  'metrics-kubernetes.state_pod-*': ['kubernetes.pod.name', 'kubernetes.pod.uid'],
  'metrics-apm.service_summary-*': ['service.name'],
  'metrics-aws.ec2_metrics-*': ['aws.ec2.instance.id', 'cloud.instance.id'],
  'metrics-aws.lambda-*': ['aws.lambda.function_name', 'aws.lambda.arn'],
  'metrics-aws.s3-*': ['aws.s3.bucket.name', 'aws.s3.bucket.arn'],
  'traces-apm-*': ['service.name'],
};

/**
 * Return the identifier-field suggestions for the currently selected
 * data stream. An empty data-stream selection (or a stream without an
 * explicit mapping, e.g. `logs-*`) yields the full list so the user can
 * still pick any field. The blank first entry renders as the
 * placeholder, matching the data-stream dropdown.
 */
const identifierFieldsForStream = (dataStream: string): readonly string[] => {
  if (!dataStream) return ['', ...ALL_IDENTIFIER_FIELDS];
  const filtered = IDENTIFIER_FIELDS_BY_DATA_STREAM[dataStream];
  return ['', ...(filtered ?? ALL_IDENTIFIER_FIELDS)];
};

/**
 * Make sure a persisted value (which may have been authored before the
 * suggestion list existed, or via a future free-text fallback) stays
 * selectable in the dropdown. Mirrors the same trick used in the subset
 * editor's `ConditionRow`.
 */
const optionsWithValue = (
  base: readonly string[],
  current: string
): Array<{ value: string; text: string }> => {
  const baseOptions = base.map((value) => ({ value, text: value || '\u2014' }));
  return baseOptions.some((option) => option.value === current) || current === ''
    ? baseOptions
    : [{ value: current, text: current }, ...baseOptions];
};

interface Props {
  readonly draft: EntityTypeDraft;
  readonly onChange: (next: GeneralFields) => void;
}

export const GeneralStep = ({ draft, onChange }: Props) => {
  const isManaged = draft.entityType.generatedBy === 'Elastic';
  const { general } = draft;

  const update = (patch: Partial<GeneralFields>) => onChange({ ...general, ...patch });

  // Live list of "extra" categories — values coming from seed data or
  // previous user-created entity types that don't appear in the
  // curated `CANONICAL_CATEGORIES`. We keep them so anything authored
  // historically stays addressable, but they're rendered separately at
  // the bottom of the dropdown so the curated order stays stable.
  const userEntityTypes = useUserEntityTypes();
  const canonicalLookup = useMemo(
    () => new Set(CANONICAL_CATEGORIES.map((category) => category.toLowerCase())),
    []
  );
  const extraCategories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const entityType of [...FAKE_ENTITY_TYPES, ...userEntityTypes]) {
      const trimmed = entityType.category.trim();
      if (trimmed.length === 0) continue;
      const key = trimmed.toLowerCase();
      if (canonicalLookup.has(key)) continue;
      if (!seen.has(key)) seen.set(key, trimmed);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [userEntityTypes, canonicalLookup]);

  const trimmedCategory = general.category.trim();
  const isCategoryKnown =
    trimmedCategory.length > 0 &&
    (canonicalLookup.has(trimmedCategory.toLowerCase()) ||
      extraCategories.some((existing) => existing.toLowerCase() === trimmedCategory.toLowerCase()));

  /**
   * Two scenarios where the inline text input must be visible:
   *   1. The user explicitly picked "+ Create new category" but hasn't
   *      typed anything yet (`general.category === ''`, but they're in
   *      create-new mode).
   *   2. The draft was hydrated with a category that doesn't match any
   *      known one (e.g. saved from a previous session before the
   *      category list contained it). We auto-flip into create-new mode
   *      so the user sees + can edit the persisted value.
   */
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState<boolean>(
    () => trimmedCategory.length > 0 && !isCategoryKnown
  );

  // If the list of known categories grows (because another wizard run
  // just registered one) and the current value is now part of it, exit
  // create-new mode so the select shows the matching entry.
  useEffect(() => {
    if (isCreatingNewCategory && isCategoryKnown) {
      setIsCreatingNewCategory(false);
    }
  }, [isCreatingNewCategory, isCategoryKnown]);

  const categoryOptions = useMemo(() => {
    const createNewLabel = i18n.translate(
      'xpack.streams.entityCentricLab.editFlyout.general.categoryCreateNew',
      { defaultMessage: '+ Create new category' }
    );
    const dividerText = '\u2500\u2500\u2500\u2500\u2500\u2500';
    // Order: "+ Create new category" first (primary affordance), then a
    // disabled divider, then the curated canonical list in its designed
    // order. Anything previously authored outside the canonical list
    // (seed data, prior user-created types) is appended at the bottom
    // behind a second divider so the curated order stays stable but
    // nothing addressable gets dropped.
    const head = [
      { value: CREATE_NEW_CATEGORY_SENTINEL, text: createNewLabel },
      { value: CATEGORY_DIVIDER_SENTINEL, text: dividerText, disabled: true },
      ...CANONICAL_CATEGORIES.map((category) => ({ value: category, text: category })),
    ];
    if (extraCategories.length === 0) return head;
    return [
      ...head,
      { value: CATEGORY_EXTRAS_DIVIDER_SENTINEL, text: dividerText, disabled: true },
      ...extraCategories.map((category) => ({ value: category, text: category })),
    ];
  }, [extraCategories]);

  // The visible "selected value" of the dropdown is derived: if we're in
  // create-new mode, snap to the sentinel so the option text shows up;
  // otherwise mirror the stored category (or `''` for the unselected
  // placeholder). We normalise canonical category casing so a draft
  // stored as e.g. `'kubernetes'` still matches the `'Kubernetes'`
  // option in the dropdown.
  const canonicalMatch = useMemo(
    () =>
      CANONICAL_CATEGORIES.find(
        (category) => category.toLowerCase() === trimmedCategory.toLowerCase()
      ),
    [trimmedCategory]
  );
  const categorySelectValue = isCreatingNewCategory
    ? CREATE_NEW_CATEGORY_SENTINEL
    : trimmedCategory.length > 0 && isCategoryKnown
    ? canonicalMatch ?? trimmedCategory
    : '';

  const handleCategorySelect = (nextValue: string) => {
    if (nextValue === CATEGORY_DIVIDER_SENTINEL || nextValue === CATEGORY_EXTRAS_DIVIDER_SENTINEL) {
      return; // visual separators, not selectable
    }
    if (nextValue === CREATE_NEW_CATEGORY_SENTINEL) {
      setIsCreatingNewCategory(true);
      // Clear any previously-picked existing category so the text input
      // starts blank; the user expects "+ Create new category" to reset
      // them to a fresh empty input.
      update({ category: '' });
      return;
    }
    setIsCreatingNewCategory(false);
    update({ category: nextValue });
  };

  /**
   * Picking a new data stream usually narrows both the identifier-field
   * and display-field choices. We reconcile the existing selections
   * against the new catalogue:
   *   - drop any previously-picked identifier that's no longer valid
   *   - if the user had no identifiers and the new list has exactly one
   *     real option, auto-pick it (the common case for streams that
   *     only carry one identifier path, e.g.
   *     `metrics-apm.service_summary-*` → `service.name`)
   *   - keep the display field if it's still valid; otherwise reset it
   *     to the (new) sole identifier when there is one, else clear it
   */
  const updateDataStream = (nextDataStream: string) => {
    const nextFields = identifierFieldsForStream(nextDataStream).filter(
      (field) => field.length > 0
    );
    let nextIdentifiers = general.identifierFields.filter((field) => nextFields.includes(field));
    if (nextIdentifiers.length === 0 && nextFields.length === 1) {
      nextIdentifiers = [nextFields[0]];
    }
    let nextDisplayField = general.displayField;
    if (!nextFields.includes(nextDisplayField)) {
      nextDisplayField = nextIdentifiers.length === 1 ? nextIdentifiers[0] : '';
    }
    update({
      dataStream: nextDataStream,
      identifierFields: nextIdentifiers,
      displayField: nextDisplayField,
    });
  };

  const dataStreamOptions = useMemo(
    () => optionsWithValue(DATA_STREAM_SUGGESTIONS, general.dataStream),
    [general.dataStream]
  );

  /**
   * Catalogue of fields for the currently-selected data stream, minus
   * the empty placeholder entry. Powers both the identifier ComboBox
   * (multi-select) and the Display-field dropdown so the two rows stay
   * in sync with the upstream stream pick.
   */
  const identifierFieldCatalogue = useMemo(
    () => identifierFieldsForStream(general.dataStream).filter((field) => field.length > 0),
    [general.dataStream]
  );

  const identifierComboBoxOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      identifierFieldCatalogue.map((field) => ({
        label: field,
        value: field,
      })),
    [identifierFieldCatalogue]
  );

  /**
   * Defensive guard against drafts persisted before a catalogue change:
   * any previously-selected identifier that's not in the current
   * catalogue still gets rendered as a pill so the user sees + can
   * remove it instead of silently disappearing.
   */
  const identifierSelectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      general.identifierFields.map((field) => ({
        label: field,
        value: field,
      })),
    [general.identifierFields]
  );

  const handleIdentifierFieldsChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const nextIdentifiers = selected.map((option) => option.value ?? option.label);
      // If the current display field is no longer one of the picked
      // identifiers AND the user only has one identifier left, snap the
      // display field to it — saves them a second click for the most
      // common case (single-identifier types). When the display field
      // is still a valid catalogue entry (e.g. they picked a
      // human-friendly name field outside the identifier tuple), leave
      // it alone.
      let nextDisplayField = general.displayField;
      if (
        nextDisplayField.length > 0 &&
        !identifierFieldCatalogue.includes(nextDisplayField) &&
        !nextIdentifiers.includes(nextDisplayField)
      ) {
        nextDisplayField = '';
      }
      if (nextDisplayField.length === 0 && nextIdentifiers.length === 1) {
        nextDisplayField = nextIdentifiers[0];
      }
      update({ identifierFields: nextIdentifiers, displayField: nextDisplayField });
    },
    // `update` is recreated every render — listing it as a dep would
    // re-create the handler each pass and tank EuiComboBox's internal
    // memoisation; we explicitly reference `general` instead so the
    // closure stays correct without the churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [general, identifierFieldCatalogue]
  );

  /**
   * Display-field options. We deliberately let the user pick any field
   * from the data-stream catalogue (not just the chosen identifiers)
   * because the human-readable name often lives outside the unique
   * tuple — e.g. identifier `kubernetes.pod.uid`, display
   * `kubernetes.pod.name`. The placeholder option keeps the dropdown
   * unselectable when no data stream has been chosen yet.
   */
  const displayFieldOptions = useMemo(
    () => optionsWithValue(['', ...identifierFieldCatalogue], general.displayField),
    [identifierFieldCatalogue, general.displayField]
  );

  return (
    <EuiForm component="form" data-test-subj="entityCentricLabEditFlyoutGeneralStep">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <p>
              {isManaged
                ? i18n.translate(
                    'xpack.streams.entityCentricLab.editFlyout.general.subtitleManaged',
                    {
                      defaultMessage: 'Managed entity types general data cannot be all customised.',
                    }
                  )
                : i18n.translate('xpack.streams.entityCentricLab.editFlyout.general.subtitleUser', {
                    defaultMessage: 'Define how this entity type is identified in your data.',
                  })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.general.entityTypeName',
              { defaultMessage: 'Entity type name' }
            )}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              readOnly={isManaged}
              value={general.name}
              onChange={(event) => update({ name: event.target.value })}
              data-test-subj="entityCentricLabEditFlyoutGeneralName"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.entityCentricLab.editFlyout.general.dataStream',
                  { defaultMessage: 'Data stream' }
                )}
                fullWidth
              >
                <EuiSelect
                  fullWidth
                  // `EuiSelect` has no `readOnly`; managed entity types
                  // can't reshape this binding so disable the control
                  // entirely, matching how other selects in the wizard
                  // treat managed mode.
                  disabled={isManaged}
                  hasNoInitialSelection={general.dataStream === ''}
                  options={dataStreamOptions}
                  value={general.dataStream}
                  onChange={(event) => updateDataStream(event.target.value)}
                  data-test-subj="entityCentricLabEditFlyoutGeneralDataStream"
                  aria-label={i18n.translate(
                    'xpack.streams.entityCentricLab.editFlyout.general.dataStream',
                    { defaultMessage: 'Data stream' }
                  )}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.entityCentricLab.editFlyout.general.identifierFields',
                  { defaultMessage: 'Identifier fields' }
                )}
                helpText={i18n.translate(
                  'xpack.streams.entityCentricLab.editFlyout.general.identifierFieldsHelp',
                  {
                    defaultMessage:
                      'Composite key that makes one instance unique. Pick one or several fields from the data stream.',
                  }
                )}
                fullWidth
              >
                <EuiComboBox<string>
                  fullWidth
                  isDisabled={isManaged}
                  placeholder={i18n.translate(
                    'xpack.streams.entityCentricLab.editFlyout.general.identifierFieldsPlaceholder',
                    { defaultMessage: 'Pick one or more fields' }
                  )}
                  options={identifierComboBoxOptions}
                  selectedOptions={identifierSelectedOptions}
                  onChange={handleIdentifierFieldsChange}
                  data-test-subj="entityCentricLabEditFlyoutGeneralIdentifierFields"
                  aria-label={i18n.translate(
                    'xpack.streams.entityCentricLab.editFlyout.general.identifierFields',
                    { defaultMessage: 'Identifier fields' }
                  )}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.general.displayField',
              { defaultMessage: 'Display field' }
            )}
            helpText={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.general.displayFieldHelp',
              {
                defaultMessage:
                  'Single field used as the entity name everywhere it appears (flyout title, lists, dependencies).',
              }
            )}
            fullWidth
          >
            <EuiSelect
              fullWidth
              disabled={isManaged || general.dataStream === ''}
              hasNoInitialSelection={general.displayField === ''}
              options={displayFieldOptions}
              value={general.displayField}
              onChange={(event) => update({ displayField: event.target.value })}
              data-test-subj="entityCentricLabEditFlyoutGeneralDisplayField"
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.general.displayField',
                { defaultMessage: 'Display field' }
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.streams.entityCentricLab.editFlyout.general.category', {
              defaultMessage: 'Category',
            })}
            fullWidth
          >
            <EuiSelect
              fullWidth
              disabled={isManaged}
              hasNoInitialSelection={categorySelectValue === ''}
              options={categoryOptions}
              value={categorySelectValue}
              onChange={(event) => handleCategorySelect(event.target.value)}
              data-test-subj="entityCentricLabEditFlyoutGeneralCategory"
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.general.category',
                { defaultMessage: 'Category' }
              )}
            />
          </EuiFormRow>
          {isCreatingNewCategory ? (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.entityCentricLab.editFlyout.general.newCategoryLabel',
                  { defaultMessage: 'New category name' }
                )}
                fullWidth
              >
                <EuiFieldText
                  fullWidth
                  autoFocus
                  readOnly={isManaged}
                  value={general.category}
                  placeholder={i18n.translate(
                    'xpack.streams.entityCentricLab.editFlyout.general.newCategoryPlaceholder',
                    { defaultMessage: 'e.g. Payments services' }
                  )}
                  onChange={(event) => update({ category: event.target.value })}
                  data-test-subj="entityCentricLabEditFlyoutGeneralNewCategoryName"
                />
              </EuiFormRow>
            </>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate('xpack.streams.entityCentricLab.editFlyout.general.description', {
              defaultMessage: 'Description',
            })}
            fullWidth
          >
            <EuiTextArea
              fullWidth
              rows={4}
              readOnly={isManaged}
              value={general.description}
              onChange={(event) => update({ description: event.target.value })}
              data-test-subj="entityCentricLabEditFlyoutGeneralDescription"
            />
          </EuiFormRow>
        </EuiFlexItem>
        {isManaged ? (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount={false}
              size="s"
              color="primary"
              iconType="info"
              title={i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.general.managedCalloutTitle',
                {
                  defaultMessage: 'This entity type is managed by Elastic',
                }
              )}
            >
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.streams.entityCentricLab.editFlyout.general.managedCalloutBody',
                    {
                      defaultMessage:
                        'Fields above describe how the entity type is detected. Customise health, ownership, flyout content and subsets in the next steps.',
                    }
                  )}
                </p>
              </EuiText>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiForm>
  );
};
