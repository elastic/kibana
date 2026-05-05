/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHealth,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EntityTypeRow } from './entity_type_types';

const EDIT_STEP_IDS = ['general', 'health', 'ownership', 'subsets', 'flyout'] as const;
type EditStepId = (typeof EDIT_STEP_IDS)[number];

const editStepIndex = (id: EditStepId) => EDIT_STEP_IDS.indexOf(id);

type OwnershipKind =
  | 'operational'
  | 'dev'
  | 'infrastructure'
  | 'security'
  | 'business';

type OwnerMapping = {
  id: string;
  resolverValue: string;
  ownerName: string;
  email: string;
  slack: string;
  ownershipType: OwnershipKind;
};

type UnmatchedRow = {
  id: string;
  resolverValue: string;
  unmatchedEntities: number;
};

type UnmatchedColumn = EuiBasicTableColumn<UnmatchedRow>;

const OWNERSHIP_OPTIONS: Array<{ id: string; label: string }> = [
  {
    id: 'operational',
    label: i18n.translate('xpack.streams.manageEntityTypes.ownershipType.operational', {
      defaultMessage: 'Operational',
    }),
  },
  {
    id: 'dev',
    label: i18n.translate('xpack.streams.manageEntityTypes.ownershipType.dev', {
      defaultMessage: 'Dev',
    }),
  },
  {
    id: 'infrastructure',
    label: i18n.translate('xpack.streams.manageEntityTypes.ownershipType.infrastructure', {
      defaultMessage: 'Infrastructure',
    }),
  },
  {
    id: 'security',
    label: i18n.translate('xpack.streams.manageEntityTypes.ownershipType.security', {
      defaultMessage: 'Security',
    }),
  },
  {
    id: 'business',
    label: i18n.translate('xpack.streams.manageEntityTypes.ownershipType.business', {
      defaultMessage: 'Business',
    }),
  },
];

export interface EditEntityTypeFlyoutProps {
  row: EntityTypeRow;
  onClose: () => void;
}

export function EditEntityTypeFlyout({ row, onClose }: EditEntityTypeFlyoutProps) {
  const [editStep, setEditStep] = useState<EditStepId>('general');
  const [activeAlertsHealth, setActiveAlertsHealth] = useState(true);
  const [availableSignalsHealth, setAvailableSignalsHealth] = useState(true);
  const [securitySignalsHealth, setSecuritySignalsHealth] = useState(true);
  const [resolverField, setResolverField] = useState('cluster.labels.team');
  const [owners, setOwners] = useState<OwnerMapping[]>([
    {
      id: 'o1',
      resolverValue: 'checkout',
      ownerName: 'checkout-team',
      email: 'checkout-team@com',
      slack: '#checkout-team',
      ownershipType: 'operational',
    },
  ]);

  useEffect(() => {
    setEditStep('general');
  }, [row.id]);

  const horizontalSteps = useMemo(
    () =>
      EDIT_STEP_IDS.map((id, index) => {
        const currentIdx = editStepIndex(editStep);
        let status: 'complete' | 'current' | 'incomplete' = 'incomplete';
        if (index < currentIdx) {
          status = 'complete';
        } else if (index === currentIdx) {
          status = 'current';
        }
        return {
          title: stepTitle(id),
          status,
        };
      }),
    [editStep]
  );

  const isLastStep = editStepIndex(editStep) === EDIT_STEP_IDS.length - 1;

  const goNext = useCallback(() => {
    const next = editStepIndex(editStep) + 1;
    if (next < EDIT_STEP_IDS.length) {
      setEditStep(EDIT_STEP_IDS[next]!);
    }
  }, [editStep]);

  const goDoneOrNext = useCallback(() => {
    if (isLastStep) {
      onClose();
      return;
    }
    goNext();
  }, [goNext, isLastStep, onClose]);

  const resolverOptions = useMemo(
    () => [
      {
        value: 'cluster.labels.team',
        text: i18n.translate('xpack.streams.manageEntityTypes.resolverSuggestedTeam', {
          defaultMessage: '[suggested] cluster.labels.team',
        }),
      },
      {
        value: 'cluster.name',
        text: 'cluster.name',
      },
    ],
    []
  );

  const unmatchedItems: UnmatchedRow[] = useMemo(
    () => [
      { id: 'u1', resolverValue: 'payment-2', unmatchedEntities: 210 },
      { id: 'u2', resolverValue: 'data-eng', unmatchedEntities: 67 },
      { id: 'u3', resolverValue: 'field value', unmatchedEntities: 33 },
    ],
    []
  );

  const unmatchedColumns = useMemo<Array<UnmatchedColumn>>(
    () => [
      {
        field: 'resolverValue',
        name: i18n.translate('xpack.streams.manageEntityTypes.coverage.columnResolverValue', {
          defaultMessage: 'Resolver field value',
        }),
      },
      {
        field: 'unmatchedEntities',
        name: i18n.translate('xpack.streams.manageEntityTypes.coverage.columnUnmatched', {
          defaultMessage: 'Unmatched entities',
        }),
      },
      {
        name: i18n.translate('xpack.streams.manageEntityTypes.coverage.columnAction', {
          defaultMessage: 'Action',
        }),
        render: () => (
          <EuiLink disabled>
            {i18n.translate('xpack.streams.manageEntityTypes.coverage.addOwner', {
              defaultMessage: 'Add owner',
            })}
          </EuiLink>
        ),
      },
    ],
    []
  );

  const generalFieldsReadOnly = row.managed;

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="streamsEditEntityTypeFlyoutTitle"
      size="l"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="streamsEditEntityTypeFlyoutTitle">
                {i18n.translate('xpack.streams.manageEntityTypes.editFlyoutTitle', {
                  defaultMessage: 'Edit {entityTypeName} entity type',
                  values: { entityTypeName: row.name },
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="iInCircle"
              color="subdued"
              content={i18n.translate('xpack.streams.manageEntityTypes.editFlyoutTitleTip', {
                defaultMessage:
                  'Entity types map streams and identifying fields to entities shown in Discover and other UIs.',
              })}
              aria-label={i18n.translate('xpack.streams.manageEntityTypes.editFlyoutTitleTipAria', {
                defaultMessage: 'About entity types',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.manageEntityTypes.editFlyoutLastUpdate', {
                defaultMessage: 'Last update {date}',
                values: { date: row.lastUpdatedDisplay },
              })}
            </EuiText>
          </EuiFlexItem>
          {row.managed ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.streams.manageEntityTypes.editFlyoutManagedBadge', {
                  defaultMessage: 'Elastic managed',
                })}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.manageEntityTypes.editFlyoutMatchingEntities', {
                defaultMessage: '{count} matching entities',
                values: { count: row.entities },
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.manageEntityTypes.editFlyoutSubsetsCount', {
                defaultMessage: '{count} subsets',
                values: { count: row.subsets },
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiStepsHorizontal size="s" steps={horizontalSteps} />
        <EuiSpacer size="l" />
        {editStep === 'general' ? (
          <GeneralStep row={row} readOnly={generalFieldsReadOnly} />
        ) : null}
        {editStep === 'health' ? (
          <HealthStep
            activeAlertsHealth={activeAlertsHealth}
            availableSignalsHealth={availableSignalsHealth}
            securitySignalsHealth={securitySignalsHealth}
            onActiveAlertsChange={setActiveAlertsHealth}
            onAvailableSignalsChange={setAvailableSignalsHealth}
            onSecuritySignalsChange={setSecuritySignalsHealth}
          />
        ) : null}
        {editStep === 'ownership' ? (
          <OwnershipStep
            resolverField={resolverField}
            resolverOptions={resolverOptions}
            onResolverChange={setResolverField}
            owners={owners}
            onOwnersChange={setOwners}
            unmatchedItems={unmatchedItems}
            unmatchedColumns={unmatchedColumns}
          />
        ) : null}
        {editStep === 'subsets' ? (
          <EuiText>
            <p>
              {i18n.translate('xpack.streams.manageEntityTypes.subsetsStepBody', {
                defaultMessage:
                  'Define how this entity type is split into subsets. Configuration options will be available in a later iteration.',
              })}
            </p>
          </EuiText>
        ) : null}
        {editStep === 'flyout' ? (
          <EuiText>
            <p>
              {i18n.translate('xpack.streams.manageEntityTypes.flyoutContentStepBody', {
                defaultMessage:
                  'Choose which tabs and panels appear in the entity details flyout for this type. Content options will be available in a later iteration.',
              })}
            </p>
          </EuiText>
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.streams.manageEntityTypes.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <EuiButtonEmpty disabled>
                {i18n.translate('xpack.streams.manageEntityTypes.saveModificationsButton', {
                  defaultMessage: 'Save modifications',
                })}
              </EuiButtonEmpty>
              <EuiButton fill onClick={goDoneOrNext}>
                {isLastStep
                  ? i18n.translate('xpack.streams.manageEntityTypes.doneButton', {
                      defaultMessage: 'Done',
                    })
                  : i18n.translate('xpack.streams.manageEntityTypes.nextStepButton', {
                      defaultMessage: 'Next step',
                    })}
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}

function GeneralStep({ row, readOnly }: { row: EntityTypeRow; readOnly: boolean }) {
  const textProps = readOnly
    ? ({ readOnly: true, value: row.name } as const)
    : ({ defaultValue: row.name } as const);

  const streamProps = readOnly
    ? ({ readOnly: true, value: row.dataStream } as const)
    : ({ defaultValue: row.dataStream } as const);

  const idFieldProps = readOnly
    ? ({ readOnly: true, value: row.entityIdField } as const)
    : ({ defaultValue: row.entityIdField } as const);

  const categoryProps = readOnly
    ? ({ readOnly: true, value: row.category } as const)
    : ({ defaultValue: row.category } as const);

  const descriptionProps = readOnly
    ? ({ readOnly: true, value: row.description } as const)
    : ({ defaultValue: row.description } as const);

  return (
    <>
      {row.managed ? (
        <>
          <EuiCallOut
            title={i18n.translate('xpack.streams.manageEntityTypes.generalManagedCalloutTitle', {
              defaultMessage: 'Managed entity types',
            })}
            color="primary"
          >
            {i18n.translate('xpack.streams.manageEntityTypes.generalManagedCalloutBody', {
              defaultMessage:
                'General information for Elastic-managed entity types cannot be fully customized.',
            })}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}
      <EuiForm component="div" key={row.id}>
        <EuiFormRow
          label={i18n.translate('xpack.streams.manageEntityTypes.field.entityTypeName', {
            defaultMessage: 'Entity type name',
          })}
        >
          <EuiFieldText
            {...textProps}
            data-test-subj="streamsManageEntityTypesEntityTypeName"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.streams.manageEntityTypes.field.dataStream', {
            defaultMessage: 'Data stream',
          })}
        >
          <EuiFieldText
            {...streamProps}
            data-test-subj="streamsManageEntityTypesDataStream"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.streams.manageEntityTypes.field.entityIdField', {
            defaultMessage: 'Stream field that identifies the entity',
          })}
        >
          <EuiFieldText
            {...idFieldProps}
            data-test-subj="streamsManageEntityTypesEntityIdField"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.streams.manageEntityTypes.field.category', {
            defaultMessage: 'Category',
          })}
        >
          <EuiFieldText
            {...categoryProps}
            data-test-subj="streamsManageEntityTypesCategory"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.streams.manageEntityTypes.field.description', {
            defaultMessage: 'Description',
          })}
        >
          <EuiTextArea
            rows={4}
            {...descriptionProps}
            data-test-subj="streamsManageEntityTypesDescription"
          />
        </EuiFormRow>
      </EuiForm>
    </>
  );
}

function HealthStep({
  activeAlertsHealth,
  availableSignalsHealth,
  securitySignalsHealth,
  onActiveAlertsChange,
  onAvailableSignalsChange,
  onSecuritySignalsChange,
}: {
  activeAlertsHealth: boolean;
  availableSignalsHealth: boolean;
  securitySignalsHealth: boolean;
  onActiveAlertsChange: (v: boolean) => void;
  onAvailableSignalsChange: (v: boolean) => void;
  onSecuritySignalsChange: (v: boolean) => void;
}) {
  return (
    <>
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.manageEntityTypes.healthIntro', {
            defaultMessage:
              'Entity types have a glanceable health indicator. Choose which signals feed into this indicator.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiHealth color="success">
            {i18n.translate('xpack.streams.manageEntityTypes.healthHealthy', {
              defaultMessage: 'Healthy',
            })}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="warning">
            {i18n.translate('xpack.streams.manageEntityTypes.healthAtRisk', {
              defaultMessage: 'At risk',
            })}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="danger">
            {i18n.translate('xpack.streams.manageEntityTypes.healthUnhealthy', {
              defaultMessage: 'Unhealthy',
            })}
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiForm component="div">
        <EuiFormRow
          label={i18n.translate('xpack.streams.manageEntityTypes.healthActiveAlerts', {
            defaultMessage: 'Active alerts severity',
          })}
          helpText={i18n.translate('xpack.streams.manageEntityTypes.healthActiveAlertsHelp', {
            defaultMessage: 'Critical alert: unhealthy, warning alert: at risk.',
          })}
        >
          <EuiSwitch
            showLabel={false}
            label={i18n.translate('xpack.streams.manageEntityTypes.healthActiveAlerts', {
              defaultMessage: 'Active alerts severity',
            })}
            checked={activeAlertsHealth}
            onChange={(e) => onActiveAlertsChange(e.target.checked)}
            data-test-subj="streamsManageEntityTypesHealthActiveAlerts"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.streams.manageEntityTypes.healthAvailableSignals', {
            defaultMessage: 'Available signals',
          })}
          helpText={i18n.translate('xpack.streams.manageEntityTypes.healthPlaceholderHelp', {
            defaultMessage: 'Use observability signals when present.',
          })}
        >
          <EuiSwitch
            showLabel={false}
            label={i18n.translate('xpack.streams.manageEntityTypes.healthAvailableSignals', {
              defaultMessage: 'Available signals',
            })}
            checked={availableSignalsHealth}
            onChange={(e) => onAvailableSignalsChange(e.target.checked)}
            data-test-subj="streamsManageEntityTypesHealthAvailableSignals"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.streams.manageEntityTypes.healthSecuritySignals', {
            defaultMessage: 'Security signals',
          })}
          helpText={i18n.translate('xpack.streams.manageEntityTypes.healthSecuritySignalsHelp', {
            defaultMessage: 'Use security detections when present.',
          })}
        >
          <EuiSwitch
            showLabel={false}
            label={i18n.translate('xpack.streams.manageEntityTypes.healthSecuritySignals', {
              defaultMessage: 'Security signals',
            })}
            checked={securitySignalsHealth}
            onChange={(e) => onSecuritySignalsChange(e.target.checked)}
            data-test-subj="streamsManageEntityTypesHealthSecuritySignals"
          />
        </EuiFormRow>
      </EuiForm>
    </>
  );
}

function OwnershipStep({
  resolverField,
  resolverOptions,
  onResolverChange,
  owners,
  onOwnersChange,
  unmatchedItems,
  unmatchedColumns,
}: {
  resolverField: string;
  resolverOptions: Array<{ value: string; text: string }>;
  onResolverChange: (v: string) => void;
  owners: OwnerMapping[];
  onOwnersChange: (next: OwnerMapping[]) => void;
  unmatchedItems: UnmatchedRow[];
  unmatchedColumns: UnmatchedColumn[];
}) {
  const addOwner = useCallback(() => {
    onOwnersChange([
      ...owners,
      {
        id: `o-${Date.now()}`,
        resolverValue: '',
        ownerName: '',
        email: '',
        slack: '',
        ownershipType: 'operational',
      },
    ]);
  }, [onOwnersChange, owners]);

  const removeOwner = useCallback(
    (id: string) => {
      onOwnersChange(owners.filter((o) => o.id !== id));
    },
    [onOwnersChange, owners]
  );

  const patchOwner = useCallback(
    (id: string, patch: Partial<Omit<OwnerMapping, 'id'>>) => {
      onOwnersChange(
        owners.map((o) => (o.id === id ? { ...o, ...patch } : o))
      );
    },
    [onOwnersChange, owners]
  );

  return (
    <>
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.manageEntityTypes.ownershipIntro', {
            defaultMessage: 'You can define ownership for this entity type.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiAccordion
        id="streamsEntityTypeResolverField"
        buttonContent={i18n.translate('xpack.streams.manageEntityTypes.ownershipAccordionResolver', {
          defaultMessage: 'Resolver field',
        })}
        paddingSize="m"
        initialIsOpen
      >
        <EuiFormRow
          label={i18n.translate('xpack.streams.manageEntityTypes.ownershipPickResolver', {
            defaultMessage: 'Pick the resolver field',
          })}
        >
          <EuiSelect
            options={resolverOptions}
            value={resolverField}
            onChange={(e) => onResolverChange(e.target.value)}
            data-test-subj="streamsManageEntityTypesResolverField"
          />
        </EuiFormRow>
      </EuiAccordion>
      <EuiSpacer size="s" />
      <EuiAccordion
        id="streamsEntityTypeOwnerMappings"
        buttonContent={i18n.translate('xpack.streams.manageEntityTypes.ownershipAccordionMappings', {
          defaultMessage: 'Mapping of owners and contacts',
        })}
        paddingSize="m"
        initialIsOpen
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.streams.manageEntityTypes.ownershipUnknownNote', {
            defaultMessage:
              "Entities with no owners will show 'Unknown ownership' in the entity flyout.",
          })}
        </EuiText>
        <EuiSpacer size="m" />
        {owners.map((owner, index) => (
          <React.Fragment key={owner.id}>
            {index > 0 ? <EuiSpacer size="m" /> : null}
            <EuiPanel paddingSize="m" hasBorder>
              <EuiFlexGroup alignItems="flexStart" gutterSize="s">
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate('xpack.streams.manageEntityTypes.ownerResolverValue', {
                      defaultMessage: 'Resolver field value',
                    })}
                  >
                    <EuiFieldText
                      value={owner.resolverValue}
                      onChange={(e) => patchOwner(owner.id, { resolverValue: e.target.value })}
                      data-test-subj={`streamsManageEntityTypesOwnerResolver-${owner.id}`}
                    />
                  </EuiFormRow>
                  <EuiFormRow
                    label={i18n.translate('xpack.streams.manageEntityTypes.ownerName', {
                      defaultMessage: 'Owner name',
                    })}
                    helpText={i18n.translate('xpack.streams.manageEntityTypes.ownerNameHelp', {
                      defaultMessage:
                        'If the owner label should mirror the resolver value, use the fieldValue placeholder supported by your ingestion pipeline.',
                    })}
                  >
                    <EuiFieldText
                      value={owner.ownerName}
                      onChange={(e) => patchOwner(owner.id, { ownerName: e.target.value })}
                      data-test-subj={`streamsManageEntityTypesOwnerName-${owner.id}`}
                    />
                  </EuiFormRow>
                  <EuiFormRow
                    label={i18n.translate('xpack.streams.manageEntityTypes.ownerEmail', {
                      defaultMessage: 'Email',
                    })}
                  >
                    <EuiFieldText
                      value={owner.email}
                      onChange={(e) => patchOwner(owner.id, { email: e.target.value })}
                      data-test-subj={`streamsManageEntityTypesOwnerEmail-${owner.id}`}
                    />
                  </EuiFormRow>
                  <EuiFormRow
                    label={i18n.translate('xpack.streams.manageEntityTypes.ownerSlack', {
                      defaultMessage: 'Slack',
                    })}
                  >
                    <EuiFieldText
                      value={owner.slack}
                      onChange={(e) => patchOwner(owner.id, { slack: e.target.value })}
                      data-test-subj={`streamsManageEntityTypesOwnerSlack-${owner.id}`}
                    />
                  </EuiFormRow>
                  <EuiFormRow
                    label={i18n.translate('xpack.streams.manageEntityTypes.ownershipTypeLabel', {
                      defaultMessage: 'Ownership type',
                    })}
                  >
                    <EuiRadioGroup
                      options={OWNERSHIP_OPTIONS.map((o) => ({
                        id: `${owner.id}-${o.id}`,
                        label: o.label,
                      }))}
                      idSelected={`${owner.id}-${owner.ownershipType}`}
                      onChange={(id) => {
                        const kind = id.replace(`${owner.id}-`, '') as OwnershipKind;
                        patchOwner(owner.id, { ownershipType: kind });
                      }}
                      name={`ownership-type-${owner.id}`}
                      data-test-subj={`streamsManageEntityTypesOwnershipType-${owner.id}`}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label={i18n.translate('xpack.streams.manageEntityTypes.removeOwner', {
                      defaultMessage: 'Remove owner',
                    })}
                    onClick={() => removeOwner(owner.id)}
                    data-test-subj={`streamsManageEntityTypesRemoveOwner-${owner.id}`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </React.Fragment>
        ))}
        <EuiSpacer size="m" />
        <EuiButtonEmpty iconType="plusInCircle" onClick={addOwner}>
          {i18n.translate('xpack.streams.manageEntityTypes.addOwner', {
            defaultMessage: 'Add owner',
          })}
        </EuiButtonEmpty>
      </EuiAccordion>
      <EuiSpacer size="s" />
      <EuiAccordion
        id="streamsEntityTypeCoveragePreview"
        buttonContent={i18n.translate('xpack.streams.manageEntityTypes.ownershipAccordionCoverage', {
          defaultMessage: 'Coverage preview',
        })}
        paddingSize="m"
        initialIsOpen
      >
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.streams.manageEntityTypes.coverageSummary', {
              defaultMessage: '78% resolved (622/847)',
            })}
          </strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiProgress value={78} max={100} size="m" color="vis0" data-test-subj="streamsManageEntityTypesCoverageProgress" />
        <EuiSpacer size="m" />
        <EuiText size="s">
          <strong>
            {i18n.translate('xpack.streams.manageEntityTypes.coverageTopUnmatched', {
              defaultMessage: 'Top unmatched values',
            })}
          </strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<UnmatchedRow>
          tableCaption={i18n.translate('xpack.streams.manageEntityTypes.coverageTableCaption', {
            defaultMessage: 'Resolver values without an owner mapping',
          })}
          items={unmatchedItems}
          columns={unmatchedColumns}
        />
      </EuiAccordion>
    </>
  );
}

function stepTitle(id: EditStepId): string {
  switch (id) {
    case 'general':
      return i18n.translate('xpack.streams.manageEntityTypes.step.general', {
        defaultMessage: 'General',
      });
    case 'health':
      return i18n.translate('xpack.streams.manageEntityTypes.step.health', {
        defaultMessage: 'Health',
      });
    case 'ownership':
      return i18n.translate('xpack.streams.manageEntityTypes.step.ownership', {
        defaultMessage: 'Ownership',
      });
    case 'subsets':
      return i18n.translate('xpack.streams.manageEntityTypes.step.subsets', {
        defaultMessage: 'Subsets',
      });
    case 'flyout':
      return i18n.translate('xpack.streams.manageEntityTypes.step.flyoutContent', {
        defaultMessage: 'Flyout content',
      });
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
