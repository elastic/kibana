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
import type { FakeEntityType } from '../fake_entity_types';
import type {
  EntityTypeDraft,
  FlyoutTabConfig,
  GeneralFields,
  HealthSignals,
  OwnershipConfig,
  SubsetDraft,
} from './fake_entity_type_draft';
import { buildBlankSubsetDraft, buildFakeEntityTypeDraft } from './fake_entity_type_draft';
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
  const [draft, setDraft] = useState<EntityTypeDraft>(() => buildFakeEntityTypeDraft(entityType));
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

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onClose();
      return;
    }
    const next = WIZARD_STEPS[stepIndex + 1];
    setCurrentStep(next);
  }, [isLastStep, onClose, stepIndex]);

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
            onSaveModifications={onClose}
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
      return <FlyoutContentStep draft={draft} onChange={onUpdateFlyoutTabs} />;
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
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onSaveModifications}
              data-test-subj="entityCentricLabEditFlyoutSave"
            >
              {i18n.translate('xpack.streams.entityCentricLab.editFlyout.save', {
                defaultMessage: 'Save modifications',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={onNext} data-test-subj="entityCentricLabEditFlyoutNext">
              {isLastStep
                ? i18n.translate('xpack.streams.entityCentricLab.editFlyout.finish', {
                    defaultMessage: 'Finish',
                  })
                : i18n.translate('xpack.streams.entityCentricLab.editFlyout.next', {
                    defaultMessage: 'Next step',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
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
