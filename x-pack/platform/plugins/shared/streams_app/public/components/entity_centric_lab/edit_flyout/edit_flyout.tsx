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
import { entityTypeToKind, setFlyoutTemplateOverride } from '@kbn/entity-centric-lab-flyout';
import type { FakeEntityType } from '../fake_entity_types';
import type {
  CustomLinkDraft,
  EntityTypeDraft,
  FlyoutTabConfig,
  GeneralFields,
  HealthSignals,
  OwnershipConfig,
  SubsetDraft,
} from './fake_entity_type_draft';
import { buildBlankSubsetDraft, buildFakeEntityTypeDraft } from './fake_entity_type_draft';
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

interface Props {
  readonly entityType: FakeEntityType;
  readonly onClose: () => void;
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

export const EditEntityTypeFlyout = ({ entityType, onClose }: Props) => {
  const titleId = useGeneratedHtmlId({ prefix: 'editEntityTypeFlyoutTitle' });
  // Re-opening the wizard for a previously-saved row should land the user
  // back on whatever they last persisted, not on the original mock defaults.
  // We seed the draft once with `buildFakeEntityTypeDraft(entityType)` and
  // overlay any persisted slice (general / health / ownership / flyoutTabs
  // / subsets) on top. The `entityType` and `coveragePreview` fields stay
  // pinned to the latest hard-coded values from `FAKE_ENTITY_TYPES`.
  const [draft, setDraft] = useState<EntityTypeDraft>(() =>
    mergePersistedDraft(
      buildFakeEntityTypeDraft(entityType),
      getPersistedEntityTypeDraft(entityType.id)
    )
  );
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

  // "Save modifications" feeds two stores:
  //   1. The shared per-`EntityKind` override store (`@kbn/entity-centric-
  //      lab-flyout`), which the entity flyout reads at render time so
  //      reordered / disabled / renamed tabs show up immediately.
  //   2. The wizard-local persistence store, keyed by `FakeEntityType.id`,
  //      so re-opening the same row hydrates the form with the user's last
  //      saved values rather than the original mock defaults.
  const handleSaveModifications = useCallback(() => {
    const kind = entityTypeToKind(draft.entityType.name);
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
    persistEntityTypeDraft(draft.entityType.id, draft);
    onClose();
  }, [draft, onClose]);

  const isSubsetEditor = view.kind === 'subset-editor';

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      size="l"
      data-test-subj="entityCentricLabEditEntityTypeFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        {isSubsetEditor ? (
          <SubsetEditorHeader
            titleId={titleId}
            entityTypeName={draft.entityType.name}
            subsetName={view.subset.name}
            onBack={handleCancelSubset}
          />
        ) : (
          <WizardHeader
            titleId={titleId}
            entityType={draft.entityType}
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
  readonly titleId: string;
  readonly entityType: FakeEntityType;
  readonly horizontalSteps: EuiStepsHorizontalProps['steps'];
}

const WizardHeader = ({ titleId, entityType, horizontalSteps }: WizardHeaderProps) => {
  const isManaged = entityType.generatedBy === 'Elastic';
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h2 id={titleId}>
              {i18n.translate('xpack.streams.entityCentricLab.editFlyout.title', {
                defaultMessage: '{name} entity type',
                values: { name: entityType.name },
              })}
            </h2>
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
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.streams.entityCentricLab.editFlyout.lastUpdate', {
          defaultMessage: 'Last update: {date}',
          values: { date: entityType.lastUpdate },
        })}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiStepsHorizontal
        size="s"
        steps={horizontalSteps}
        data-test-subj="entityCentricLabEditFlyoutStepsHorizontal"
      />
    </>
  );
};

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
  readonly isLastStep: boolean;
  readonly onCancel: () => void;
  readonly onSaveModifications: () => void;
  readonly onNext: () => void;
}

const FooterWizard = ({ isLastStep, onCancel, onSaveModifications, onNext }: FooterWizardProps) => {
  const saveLabel = i18n.translate('xpack.streams.entityCentricLab.editFlyout.save', {
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
