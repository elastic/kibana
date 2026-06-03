/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiStepsHorizontalProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  entityTypeToKind,
  setEntityDisplayConfig,
  setFlyoutTemplateOverride,
} from '@kbn/entity-centric-lab-flyout';
import type { FakeEntityType } from '../fake_entity_types';
import { addUserEntityType } from '../user_entity_types';
import type {
  CustomLinkDraft,
  EntityTypeDraft,
  FlyoutTabConfig,
  GeneralFields,
  HealthSignals,
  OwnershipConfig,
  SubsetDraft,
} from './fake_entity_type_draft';
import {
  buildBlankEntityType,
  buildBlankSubsetDraft,
  buildFakeEntityTypeDraft,
} from './fake_entity_type_draft';
import {
  getPersistedEntityTypeDraft,
  mergePersistedDraft,
  persistEntityTypeDraft,
} from './edit_flyout_persistence';
import { GeneralStep } from './steps/general_step';
import { HealthStep } from './steps/health_step';
import { OwnershipStep } from './steps/ownership_step';
import { FlyoutContentStep } from './steps/flyout_content_step';
import { SubsetsStep } from './steps/subsets_step';
import { SubsetEditorBody } from './subset_editor';

/**
 * The wizard runs in two modes:
 *   - `'edit'`: hydrate from a known `FakeEntityType` row and overlay any
 *     persisted draft. Save persists back to the same row id and to the
 *     shared per-kind override store.
 *   - `'create'`: hydrate from a synthetic empty `FakeEntityType` minted
 *     per session (the row never lands in the read-only table — see
 *     `buildBlankEntityType`). Save still writes to the override store
 *     when the entered name resolves to a kind, but skips wizard-local
 *     persistence (no row to re-open).
 */
type FlyoutMode = 'edit' | 'create';

interface CommonProps {
  readonly onClose: () => void;
}

interface EditProps extends CommonProps {
  readonly entityType: FakeEntityType;
}

export const EditEntityTypeFlyout = ({ entityType, onClose }: EditProps) => (
  <EntityTypeWizardFlyout mode="edit" entityType={entityType} onClose={onClose} />
);

export const CreateEntityTypeFlyout = ({ onClose }: CommonProps) => {
  // Mint the synthetic entity type once per open. Doing it inline (rather
  // than at module scope) prevents two stacked create flyouts from
  // sharing the same id, which would collide in the persistence store.
  const blankEntityType = useMemo(() => buildBlankEntityType(), []);
  return <EntityTypeWizardFlyout mode="create" entityType={blankEntityType} onClose={onClose} />;
};

interface WizardProps extends CommonProps {
  readonly mode: FlyoutMode;
  readonly entityType: FakeEntityType;
}

type WizardStepId = 'general' | 'health' | 'ownership' | 'flyoutContent' | 'subsets';

const WIZARD_STEPS: readonly WizardStepId[] = [
  'general',
  'health',
  'ownership',
  'flyoutContent',
  'subsets',
];

type View = { kind: 'wizard' } | { kind: 'subset-editor'; subset: SubsetDraft };

const EntityTypeWizardFlyout = ({ mode, entityType, onClose }: WizardProps) => {
  const isCreate = mode === 'create';
  const titleId = useGeneratedHtmlId({
    prefix: isCreate ? 'createEntityTypeFlyoutTitle' : 'editEntityTypeFlyoutTitle',
  });
  // Edit mode: re-opening the wizard for a previously-saved row should
  // land the user back on whatever they last persisted. We seed once with
  // `buildFakeEntityTypeDraft(entityType)` and overlay any persisted
  // slice on top. Create mode: never overlay — the synthetic id is unique
  // per session and there's nothing meaningful to hydrate. We also strip
  // every General-step field so the user lands on a blank form (the
  // default seed would otherwise show auto-generated placeholders like
  // `metrics-new-entity-type-xxx-*` derived from the synthetic id).
  const [draft, setDraft] = useState<EntityTypeDraft>(() => {
    const base = buildFakeEntityTypeDraft(entityType);
    if (isCreate) {
      return {
        ...base,
        general: {
          name: '',
          dataStream: '',
          identifierFields: [],
          displayField: '',
          category: '',
          description: '',
        },
      };
    }
    return mergePersistedDraft(base, getPersistedEntityTypeDraft(entityType.id));
  });
  const [currentStep, setCurrentStep] = useState<WizardStepId>('general');
  const [view, setView] = useState<View>({ kind: 'wizard' });

  const stepIndex = WIZARD_STEPS.indexOf(currentStep);
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;

  const stepLabel = useMemo<Record<WizardStepId, string>>(
    () => ({
      general: i18n.translate('xpack.streams.entityCentricLab.editFlyout.steps.general', {
        defaultMessage: 'General',
      }),
      health: i18n.translate('xpack.streams.entityCentricLab.editFlyout.steps.health', {
        defaultMessage: 'Health',
      }),
      ownership: i18n.translate('xpack.streams.entityCentricLab.editFlyout.steps.ownership', {
        defaultMessage: 'Ownership',
      }),
      flyoutContent: i18n.translate(
        'xpack.streams.entityCentricLab.editFlyout.steps.flyoutContent',
        { defaultMessage: 'Flyout content' }
      ),
      subsets: i18n.translate('xpack.streams.entityCentricLab.editFlyout.steps.subsets', {
        defaultMessage: 'Subsets',
      }),
    }),
    []
  );

  const horizontalSteps = useMemo<EuiStepsHorizontalProps['steps']>(
    () =>
      WIZARD_STEPS.map((id, index) => ({
        title: stepLabel[id],
        status: index < stepIndex ? 'complete' : index === stepIndex ? 'current' : 'incomplete',
        onClick: () => setCurrentStep(id),
      })),
    [stepIndex, stepLabel]
  );

  const updateGeneral = useCallback(
    (next: GeneralFields) => setDraft((prev) => ({ ...prev, general: next })),
    []
  );
  const updateHealth = useCallback(
    (next: HealthSignals) => setDraft((prev) => ({ ...prev, health: next })),
    []
  );
  const updateOwnership = useCallback(
    (next: OwnershipConfig) => setDraft((prev) => ({ ...prev, ownership: next })),
    []
  );
  const updateFlyoutTabs = useCallback(
    (next: FlyoutTabConfig[]) => setDraft((prev) => ({ ...prev, flyoutTabs: next })),
    []
  );
  const updateCustomLinks = useCallback(
    (next: CustomLinkDraft[]) => setDraft((prev) => ({ ...prev, customLinks: next })),
    []
  );
  const updateSubsets = useCallback(
    (next: SubsetDraft[]) => setDraft((prev) => ({ ...prev, subsets: next })),
    []
  );

  const handleAddSubset = useCallback(() => {
    setView({ kind: 'subset-editor', subset: buildBlankSubsetDraft(draft) });
  }, [draft]);

  const handleEditSubset = useCallback(
    (subsetId: string) => {
      const target = draft.subsets.find((subset) => subset.id === subsetId);
      if (target) {
        setView({ kind: 'subset-editor', subset: target });
      }
    },
    [draft.subsets]
  );

  const handleCancelSubset = useCallback(() => {
    setView({ kind: 'wizard' });
  }, []);

  const handleSaveSubset = useCallback(() => {
    if (view.kind !== 'subset-editor') return;
    const subsetToCommit = view.subset;
    setDraft((prev) => {
      const exists = prev.subsets.some((subset) => subset.id === subsetToCommit.id);
      const subsets = exists
        ? prev.subsets.map((subset) => (subset.id === subsetToCommit.id ? subsetToCommit : subset))
        : [...prev.subsets, subsetToCommit];
      return { ...prev, subsets };
    });
    setCurrentStep('subsets');
    setView({ kind: 'wizard' });
  }, [view]);

  const updateEditingSubset = useCallback((next: SubsetDraft) => {
    setView((prev) =>
      prev.kind === 'subset-editor' ? { kind: 'subset-editor', subset: next } : prev
    );
  }, []);

  // Only ever invoked from the "Next step" button, which the footer hides on
  // the last step. The previous last-step branch that just closed the flyout
  // without saving is gone — that path now lives in
  // `handleSaveModifications` and is wired to a single primary button.
  const handleNext = useCallback(() => {
    if (isLastStep) return;
    const next = WIZARD_STEPS[stepIndex + 1];
    setCurrentStep(next);
  }, [isLastStep, stepIndex]);

  // "Save modifications" feeds three stores:
  //   1. The shared per-`EntityKind` override store (`@kbn/entity-centric-
  //      lab-flyout`), which the entity flyout reads at render time so
  //      reordered / disabled / renamed tabs show up immediately.
  //   2. The wizard-local persistence store, keyed by `FakeEntityType.id`,
  //      so re-opening the same row hydrates the form with the user's last
  //      saved values rather than the original mock defaults.
  //   3. (create mode only) The user-types store, which the Manage page
  //      concatenates with the hardcoded `FAKE_ENTITY_TYPES` catalogue so
  //      the new row shows up in the table immediately.
  const handleSaveModifications = useCallback(() => {
    // Kind resolution uses the *edited* name from `general`, not the
    // seed `entityType.name`. In edit mode the user can rename a row;
    // in create mode the seed name is empty and only `general.name`
    // carries the user's input.
    const kind = entityTypeToKind(draft.general.name);
    if (kind) {
      // The seeded blank row (and any rows the user added but never filled
      // in) shouldn't pollute the runtime override — `url` is the minimum
      // signal that an entry was intentional. We persist the *unfiltered*
      // list to the wizard store below so re-opening the form still shows
      // the user's in-progress rows.
      const meaningfulLinks = draft.customLinks
        .filter((link) => link.url.trim().length > 0)
        .map((link) => ({
          id: link.id,
          type: link.type,
          url: link.url,
          label: link.label,
        }));
      setFlyoutTemplateOverride(kind, {
        flyoutTabs: draft.flyoutTabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          enabled: tab.enabled,
        })),
        customLinks: meaningfulLinks,
      });
    }
    // Push the per-type display config to the shared store so every
    // renderer (entity flyout title, Streams entities list/grid,
    // dependency rows, Discover logs panel) instantly re-labels entities
    // of this type using the user's choice. Keyed by `FakeEntityType.id`
    // so create- and edit-mode rows behave the same way without going
    // through the kind-based bridge that templates use.
    setEntityDisplayConfig(draft.entityType.id, {
      identifierFields: draft.general.identifierFields,
      displayField: draft.general.displayField,
    });
    if (isCreate) {
      // Compose the row that will appear in the Manage table from the
      // edited fields. We trust the synthetic id minted at flyout open
      // (`buildBlankEntityType`) for stable id-keyed lookups, and fall
      // back to sensible placeholders when the user left optional
      // fields blank.
      const trimmedName = draft.general.name.trim();
      const trimmedCategory = draft.general.category.trim();
      const newRow: FakeEntityType = {
        id: draft.entityType.id,
        name:
          trimmedName.length > 0
            ? trimmedName
            : i18n.translate('xpack.streams.entityCentricLab.createFlyout.untitledRow', {
                defaultMessage: 'Untitled entity type',
              }),
        generatedBy: 'User',
        category: trimmedCategory.length > 0 ? trimmedCategory : 'Custom',
        entitiesCount: '0',
        subsetsCount: String(draft.subsets.length),
        // Hand-formatted to match the existing rows in the table
        // (e.g. `'2026-04-20'`).
        lastUpdate: new Date().toISOString().slice(0, 10),
      };
      addUserEntityType(newRow);
    }
    persistEntityTypeDraft(draft.entityType.id, draft);
    onClose();
  }, [draft, isCreate, onClose]);

  const isSubsetEditor = view.kind === 'subset-editor';

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      size="l"
      data-test-subj={
        isCreate ? 'entityCentricLabCreateEntityTypeFlyout' : 'entityCentricLabEditEntityTypeFlyout'
      }
    >
      <EuiFlyoutHeader hasBorder>
        {isSubsetEditor ? (
          <SubsetEditorHeader
            titleId={titleId}
            // In create mode the seed `entityType.name` is empty until the
            // user fills in General. Falling back to a placeholder keeps
            // the breadcrumb readable.
            entityTypeName={draft.general.name || newEntityTypeFallbackName()}
            subsetName={view.subset.name}
            onBack={handleCancelSubset}
          />
        ) : (
          <WizardHeader
            mode={mode}
            titleId={titleId}
            entityType={draft.entityType}
            entityTypeName={draft.general.name}
            horizontalSteps={horizontalSteps}
          />
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isSubsetEditor ? (
          <SubsetEditorBody
            entityType={draft.entityType}
            subset={view.subset}
            onChange={updateEditingSubset}
          />
        ) : (
          <WizardBody
            stepId={currentStep}
            draft={draft}
            onUpdateGeneral={updateGeneral}
            onUpdateHealth={updateHealth}
            onUpdateOwnership={updateOwnership}
            onUpdateFlyoutTabs={updateFlyoutTabs}
            onUpdateCustomLinks={updateCustomLinks}
            onUpdateSubsets={updateSubsets}
            onAddSubset={handleAddSubset}
            onEditSubset={handleEditSubset}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        {isSubsetEditor ? (
          <FooterSubsetEditor onCancel={handleCancelSubset} onSave={handleSaveSubset} />
        ) : (
          <FooterWizard
            mode={mode}
            isLastStep={isLastStep}
            onCancel={onClose}
            onSaveModifications={handleSaveModifications}
            onNext={handleNext}
          />
        )}
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

interface WizardHeaderProps {
  readonly mode: FlyoutMode;
  readonly titleId: string;
  readonly entityType: FakeEntityType;
  readonly entityTypeName: string;
  readonly horizontalSteps: EuiStepsHorizontalProps['steps'];
}

const WizardHeader = ({
  mode,
  titleId,
  entityType,
  entityTypeName,
  horizontalSteps,
}: WizardHeaderProps) => {
  const isCreate = mode === 'create';
  const isManaged = entityType.generatedBy === 'Elastic';
  const titleText = isCreate
    ? // Create mode: show a static "New entity type" title until the user
      // types a name, then mirror the entered name so the header tracks
      // what the user is building.
      entityTypeName.trim().length > 0
      ? i18n.translate('xpack.streams.entityCentricLab.createFlyout.titleWithName', {
          defaultMessage: '{name} entity type',
          values: { name: entityTypeName },
        })
      : i18n.translate('xpack.streams.entityCentricLab.createFlyout.title', {
          defaultMessage: 'New entity type',
        })
    : i18n.translate('xpack.streams.entityCentricLab.editFlyout.title', {
        defaultMessage: '{name} entity type',
        values: { name: entityType.name },
      });

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2 id={titleId}>{titleText}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            label={i18n.translate('xpack.streams.entityCentricLab.editFlyout.labBadgeLabel', {
              defaultMessage: 'Lab',
            })}
            size="s"
            color="hollow"
          />
        </EuiFlexItem>
        {isCreate ? (
          // Create mode shows only the kind-of-ownership badge so the
          // user sees what they're authoring will be User-defined. The
          // counts + last-update badges are meaningless for a row that
          // doesn't exist yet.
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">
              {i18n.translate('xpack.streams.entityCentricLab.editFlyout.userBadge', {
                defaultMessage: 'User-defined',
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : (
          <>
            <EuiFlexItem grow={false}>
              <EuiBadge color={isManaged ? 'hollow' : 'primary'}>
                {isManaged
                  ? i18n.translate('xpack.streams.entityCentricLab.editFlyout.managedBadge', {
                      defaultMessage: 'Elastic-managed',
                    })
                  : i18n.translate('xpack.streams.entityCentricLab.editFlyout.userBadge', {
                      defaultMessage: 'User-defined',
                    })}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.streams.entityCentricLab.editFlyout.matchingEntitiesBadge', {
                  defaultMessage: '{count} matching entities',
                  values: { count: entityType.entitiesCount },
                })}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetsBadge', {
                  defaultMessage: '{count} subsets',
                  values: { count: entityType.subsetsCount },
                })}
              </EuiBadge>
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
      {isCreate ? null : (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.entityCentricLab.editFlyout.lastUpdate', {
              defaultMessage: 'Last update: {date}',
              values: { date: entityType.lastUpdate },
            })}
          </EuiText>
        </>
      )}
      <EuiSpacer size="m" />
      <EuiStepsHorizontal
        size="s"
        steps={horizontalSteps}
        data-test-subj="entityCentricLabEditFlyoutStepsHorizontal"
      />
    </>
  );
};

/**
 * Placeholder name shown in subset-editor breadcrumbs while the user
 * hasn't named the entity type yet in create mode. Pulled out so the
 * subset editor and any other surface stays consistent.
 */
const newEntityTypeFallbackName = () =>
  i18n.translate('xpack.streams.entityCentricLab.createFlyout.fallbackName', {
    defaultMessage: 'new entity type',
  });

interface SubsetEditorHeaderProps {
  readonly titleId: string;
  readonly entityTypeName: string;
  readonly subsetName: string;
  readonly onBack: () => void;
}

const SubsetEditorHeader = ({
  titleId,
  entityTypeName,
  subsetName,
  onBack,
}: SubsetEditorHeaderProps) => {
  return (
    <>
      <EuiLink onClick={onBack} data-test-subj="entityCentricLabEditFlyoutSubsetEditorBack">
        {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.backLink', {
          defaultMessage: '← Back to {name} entity type',
          values: { name: entityTypeName },
        })}
      </EuiLink>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2 id={titleId}>
              {subsetName.length > 0
                ? subsetName
                : i18n.translate(
                    'xpack.streams.entityCentricLab.editFlyout.subsetEditor.newTitle',
                    { defaultMessage: 'New subset' }
                  )}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.subsetEditor.labBadgeLabel',
              { defaultMessage: 'Lab' }
            )}
            size="s"
            color="hollow"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

interface WizardBodyProps {
  readonly stepId: WizardStepId;
  readonly draft: EntityTypeDraft;
  readonly onUpdateGeneral: (next: GeneralFields) => void;
  readonly onUpdateHealth: (next: HealthSignals) => void;
  readonly onUpdateOwnership: (next: OwnershipConfig) => void;
  readonly onUpdateFlyoutTabs: (next: FlyoutTabConfig[]) => void;
  readonly onUpdateCustomLinks: (next: CustomLinkDraft[]) => void;
  readonly onUpdateSubsets: (next: SubsetDraft[]) => void;
  readonly onAddSubset: () => void;
  readonly onEditSubset: (subsetId: string) => void;
}

const WizardBody = ({
  stepId,
  draft,
  onUpdateGeneral,
  onUpdateHealth,
  onUpdateOwnership,
  onUpdateFlyoutTabs,
  onUpdateCustomLinks,
  onUpdateSubsets,
  onAddSubset,
  onEditSubset,
}: WizardBodyProps) => {
  switch (stepId) {
    case 'general':
      return <GeneralStep draft={draft} onChange={onUpdateGeneral} />;
    case 'health':
      return <HealthStep draft={draft} onChange={onUpdateHealth} />;
    case 'ownership':
      return <OwnershipStep draft={draft} onChange={onUpdateOwnership} />;
    case 'flyoutContent':
      return (
        <FlyoutContentStep
          draft={draft}
          onChange={onUpdateFlyoutTabs}
          onCustomLinksChange={onUpdateCustomLinks}
        />
      );
    case 'subsets':
      return (
        <SubsetsStep
          draft={draft}
          onChange={onUpdateSubsets}
          onAddSubset={onAddSubset}
          onEditSubset={onEditSubset}
        />
      );
  }
};

interface FooterWizardProps {
  readonly mode: FlyoutMode;
  readonly isLastStep: boolean;
  readonly onCancel: () => void;
  readonly onSaveModifications: () => void;
  readonly onNext: () => void;
}

const FooterWizard = ({
  mode,
  isLastStep,
  onCancel,
  onSaveModifications,
  onNext,
}: FooterWizardProps) => {
  // "Save modifications" reads weird when the entity type doesn't exist
  // yet — relabel to "Create entity type" in create mode so the primary
  // action matches the user's intent.
  const saveLabel =
    mode === 'create'
      ? i18n.translate('xpack.streams.entityCentricLab.createFlyout.save', {
          defaultMessage: 'Create entity type',
        })
      : i18n.translate('xpack.streams.entityCentricLab.editFlyout.save', {
          defaultMessage: 'Save modifications',
        });
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="entityCentricLabEditFlyoutCancel">
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isLastStep ? (
          // On the final step there is nothing left to navigate to, so the
          // old "Save modifications" link + "Finish" pair collapsed into a
          // single primary action that both persists the draft and closes
          // the flyout. The previous "Finish" button only closed without
          // saving, which was the source of confusion.
          <EuiButton
            fill
            onClick={onSaveModifications}
            data-test-subj="entityCentricLabEditFlyoutSave"
          >
            {saveLabel}
          </EuiButton>
        ) : (
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onSaveModifications}
                data-test-subj="entityCentricLabEditFlyoutSave"
              >
                {saveLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={onNext} data-test-subj="entityCentricLabEditFlyoutNext">
                {i18n.translate('xpack.streams.entityCentricLab.editFlyout.next', {
                  defaultMessage: 'Next step',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface FooterSubsetEditorProps {
  readonly onCancel: () => void;
  readonly onSave: () => void;
}

const FooterSubsetEditor = ({ onCancel, onSave }: FooterSubsetEditorProps) => {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={onCancel}
          data-test-subj="entityCentricLabEditFlyoutSubsetEditorCancel"
        >
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          onClick={onSave}
          data-test-subj="entityCentricLabEditFlyoutSubsetEditorSave"
        >
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsetEditor.save', {
            defaultMessage: 'Save subset',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
