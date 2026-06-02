/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  CoveragePreview,
  EntityTypeDraft,
  OwnerMapping,
  OwnershipConfig,
  OwnershipType,
  UnmatchedResolverValue,
} from '../fake_entity_type_draft';
import { buildBlankOwnerMapping } from '../fake_entity_type_draft';

interface StepProps {
  readonly draft: EntityTypeDraft;
  readonly onChange: (next: OwnershipConfig) => void;
}

const RESOLVER_FIELD_OPTIONS = [
  {
    value: '[suggested] cluster.labels.team',
    text: i18n.translate(
      'xpack.streams.entityCentricLab.editFlyout.ownership.resolverFieldSuggested',
      {
        defaultMessage: '[suggested] cluster.labels.team',
      }
    ),
  },
  { value: 'service.labels.team', text: 'service.labels.team' },
  { value: 'aws.tags.Team', text: 'aws.tags.Team' },
  { value: 'host.tags.owner', text: 'host.tags.owner' },
];

const OWNERSHIP_TYPE_OPTIONS: ReadonlyArray<{ id: OwnershipType; label: string }> = [
  {
    id: 'operational',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.editFlyout.ownership.ownershipTypeOperational',
      { defaultMessage: 'Operational' }
    ),
  },
  {
    id: 'dev',
    label: i18n.translate('xpack.streams.entityCentricLab.editFlyout.ownership.ownershipTypeDev', {
      defaultMessage: 'Dev',
    }),
  },
  {
    id: 'infrastructure',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.editFlyout.ownership.ownershipTypeInfrastructure',
      { defaultMessage: 'Infrastructure' }
    ),
  },
  {
    id: 'security',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.editFlyout.ownership.ownershipTypeSecurity',
      { defaultMessage: 'Security' }
    ),
  },
  {
    id: 'business',
    label: i18n.translate(
      'xpack.streams.entityCentricLab.editFlyout.ownership.ownershipTypeBusiness',
      { defaultMessage: 'Business' }
    ),
  },
];

export const OwnershipStep = ({ draft, onChange }: StepProps) => {
  return (
    <div data-test-subj="entityCentricLabEditFlyoutOwnershipStep">
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.ownership.intro', {
            defaultMessage: 'You can define ownership for this entity type.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <OwnershipForm
        ownership={draft.ownership}
        coveragePreview={draft.coveragePreview}
        onChange={onChange}
        idPrefix="ownership"
        testSubjPrefix="entityCentricLabEditFlyoutOwnership"
      />
    </div>
  );
};

export interface OwnershipFormProps {
  readonly ownership: OwnershipConfig;
  readonly coveragePreview: CoveragePreview;
  readonly onChange: (next: OwnershipConfig) => void;
  /** Prefix used to generate stable accordion ids. */
  readonly idPrefix: string;
  /** Prefix used to derive data-test-subj values. */
  readonly testSubjPrefix: string;
}

/**
 * Reusable ownership editor (resolver field + owners mapping + coverage
 * preview). Used both from Step 3 of the wizard and from the subset
 * editor's "Ownership overrides" accordion.
 */
export const OwnershipForm = ({
  ownership,
  coveragePreview,
  onChange,
  idPrefix,
  testSubjPrefix,
}: OwnershipFormProps) => {
  const resolverFieldAccordionId = useGeneratedHtmlId({ prefix: `${idPrefix}ResolverField` });
  const mappingAccordionId = useGeneratedHtmlId({ prefix: `${idPrefix}Mapping` });
  const coverageAccordionId = useGeneratedHtmlId({ prefix: `${idPrefix}Coverage` });

  const updateOwner = useCallback(
    (ownerId: string, patch: Partial<OwnerMapping>) => {
      onChange({
        ...ownership,
        owners: ownership.owners.map((owner) =>
          owner.id === ownerId ? { ...owner, ...patch } : owner
        ),
      });
    },
    [onChange, ownership]
  );

  const removeOwner = useCallback(
    (ownerId: string) => {
      onChange({
        ...ownership,
        owners: ownership.owners.filter((owner) => owner.id !== ownerId),
      });
    },
    [onChange, ownership]
  );

  const addOwner = useCallback(() => {
    onChange({
      ...ownership,
      owners: [...ownership.owners, buildBlankOwnerMapping()],
    });
  }, [onChange, ownership]);

  return (
    <>
      <EuiAccordion
        id={resolverFieldAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.ownership.resolverFieldTitle',
                { defaultMessage: 'Resolver field' }
              )}
            </h3>
          </EuiTitle>
        }
        paddingSize="m"
      >
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.ownership.resolverFieldLabel',
            { defaultMessage: 'Pick the resolver field' }
          )}
          fullWidth
        >
          <EuiSelect
            fullWidth
            value={ownership.resolverField}
            options={
              RESOLVER_FIELD_OPTIONS.some((option) => option.value === ownership.resolverField)
                ? RESOLVER_FIELD_OPTIONS
                : [
                    { value: ownership.resolverField, text: ownership.resolverField },
                    ...RESOLVER_FIELD_OPTIONS,
                  ]
            }
            onChange={(event) => onChange({ ...ownership, resolverField: event.target.value })}
            data-test-subj={`${testSubjPrefix}ResolverField`}
          />
        </EuiFormRow>
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={mappingAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.streams.entityCentricLab.editFlyout.ownership.mappingTitle', {
                defaultMessage: 'Mapping of owners and contacts',
              })}
            </h3>
          </EuiTitle>
        }
        paddingSize="m"
      >
        <EuiCallOut
          announceOnMount={false}
          size="s"
          color="primary"
          iconType="info"
          title={i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.ownership.mappingCallout',
            {
              defaultMessage:
                'Entities with no owners will show "Unknown ownership" in the entity flyout.',
            }
          )}
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="m">
          {ownership.owners.map((owner, index) => (
            <EuiFlexItem key={owner.id} grow={false}>
              <OwnerCard
                owner={owner}
                index={index + 1}
                testSubjPrefix={testSubjPrefix}
                onUpdate={(patch) => updateOwner(owner.id, patch)}
                onRemove={() => removeOwner(owner.id)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiButtonEmpty
          iconType="plusInCircle"
          onClick={addOwner}
          data-test-subj={`${testSubjPrefix}AddOwner`}
        >
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.ownership.addOwnerButton', {
            defaultMessage: 'Add owner',
          })}
        </EuiButtonEmpty>
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={coverageAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.streams.entityCentricLab.editFlyout.ownership.coverageTitle', {
                defaultMessage: 'Coverage preview',
              })}
            </h3>
          </EuiTitle>
        }
        paddingSize="m"
      >
        <CoverageBar coverage={coveragePreview} testSubjPrefix={testSubjPrefix} />
      </EuiAccordion>
    </>
  );
};

interface OwnerCardProps {
  readonly owner: OwnerMapping;
  readonly index: number;
  readonly testSubjPrefix: string;
  readonly onUpdate: (patch: Partial<OwnerMapping>) => void;
  readonly onRemove: () => void;
}

const OwnerCard = ({ owner, index, testSubjPrefix, onUpdate, onRemove }: OwnerCardProps) => {
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.streams.entityCentricLab.editFlyout.ownership.ownerTitle', {
                defaultMessage: 'Owner {index}',
                values: { index },
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            onClick={onRemove}
            aria-label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.ownership.removeOwnerAriaLabel',
              {
                defaultMessage: 'Remove owner',
              }
            )}
            data-test-subj={`${testSubjPrefix}Remove-${owner.id}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.ownership.resolverValueLabel',
          { defaultMessage: 'Resolver field value' }
        )}
        fullWidth
      >
        <EuiFieldText
          fullWidth
          value={owner.resolverValue}
          onChange={(event) => onUpdate({ resolverValue: event.target.value })}
          data-test-subj={`${testSubjPrefix}ResolverValue-${owner.id}`}
        />
      </EuiFormRow>
      {/*
        The resolver-value EuiFormRow has no built-in bottom margin, so
        without this spacer the owner name / email / slack row would butt
        right up against the field above — which was visibly too tight.
        A single `m` spacer brings the gap in line with the rest of the
        owner-card rhythm (title -> row, hint -> ownership type).
      */}
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.ownership.ownerNameLabel',
              { defaultMessage: 'owner name' }
            )}
          >
            <EuiFieldText
              value={owner.ownerName}
              onChange={(event) => onUpdate({ ownerName: event.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.ownership.ownerEmailLabel',
              { defaultMessage: 'email' }
            )}
          >
            <EuiFieldText
              value={owner.email}
              onChange={(event) => onUpdate({ email: event.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.entityCentricLab.editFlyout.ownership.ownerSlackLabel',
              { defaultMessage: 'slack' }
            )}
          >
            <EuiFieldText
              value={owner.slack}
              onChange={(event) => onUpdate({ slack: event.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.ownership.ownerHint', {
            defaultMessage: 'Use "{fieldValue}" if the owner is in the resolver field value',
            values: { fieldValue: '{fieldValue}' },
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.ownership.ownershipTypeLabel',
          { defaultMessage: 'Ownership type' }
        )}
      >
        <EuiRadioGroup
          name={`ownership-type-${owner.id}`}
          options={[...OWNERSHIP_TYPE_OPTIONS]}
          idSelected={owner.ownershipType}
          onChange={(id) => onUpdate({ ownershipType: id as OwnershipType })}
        />
      </EuiFormRow>
    </EuiPanel>
  );
};

interface CoverageBarProps {
  readonly coverage: CoveragePreview;
  readonly testSubjPrefix: string;
}

const CoverageBar = ({ coverage, testSubjPrefix }: CoverageBarProps) => {
  const unmatchedColumns: Array<EuiBasicTableColumn<UnmatchedResolverValue>> = [
    {
      field: 'value',
      name: i18n.translate(
        'xpack.streams.entityCentricLab.editFlyout.ownership.coverageColumnValue',
        { defaultMessage: 'Resolver field value' }
      ),
    },
    {
      field: 'unmatchedEntities',
      name: i18n.translate(
        'xpack.streams.entityCentricLab.editFlyout.ownership.coverageColumnUnmatched',
        { defaultMessage: 'Unmatched entities' }
      ),
      align: 'right',
      width: '180px',
    },
    {
      name: i18n.translate(
        'xpack.streams.entityCentricLab.editFlyout.ownership.coverageColumnAction',
        { defaultMessage: 'Action' }
      ),
      width: '140px',
      render: () => (
        <EuiLink onClick={() => undefined} data-test-subj={`${testSubjPrefix}AddOwnerInline`}>
          {i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.ownership.coverageAddOwnerLink',
            { defaultMessage: 'Add owner' }
          )}
        </EuiLink>
      ),
    },
  ];

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText>
            <strong>
              {i18n.translate(
                'xpack.streams.entityCentricLab.editFlyout.ownership.coverageHeadline',
                {
                  defaultMessage: '{percent}% resolved ({resolved}/{total})',
                  values: {
                    percent: coverage.resolvedPercent,
                    resolved: coverage.resolvedCount,
                    total: coverage.totalCount,
                  },
                }
              )}
            </strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiProgress
        value={coverage.resolvedPercent}
        max={100}
        size="m"
        color={coverage.resolvedPercent >= 75 ? 'success' : 'warning'}
      />
      <EuiHorizontalRule margin="m" />
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate(
            'xpack.streams.entityCentricLab.editFlyout.ownership.coverageUnmatchedTitle',
            { defaultMessage: 'Top unmatched values' }
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiBasicTable<UnmatchedResolverValue>
        items={[...coverage.unmatched]}
        columns={unmatchedColumns}
        rowHeader="value"
        tableCaption={i18n.translate(
          'xpack.streams.entityCentricLab.editFlyout.ownership.coverageTableCaption',
          { defaultMessage: 'Top unmatched resolver values' }
        )}
        data-test-subj={`${testSubjPrefix}CoverageTable`}
      />
    </>
  );
};
