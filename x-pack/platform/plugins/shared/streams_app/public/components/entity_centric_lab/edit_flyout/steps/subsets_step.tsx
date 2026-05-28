/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityTypeDraft, SubsetDraft } from '../fake_entity_type_draft';

interface Props {
  readonly draft: EntityTypeDraft;
  readonly onChange: (next: SubsetDraft[]) => void;
  readonly onAddSubset: () => void;
  readonly onEditSubset: (subsetId: string) => void;
}

export const SubsetsStep = ({ draft, onChange, onAddSubset, onEditSubset }: Props) => {
  const { subsets, entityType } = draft;

  const toggleSubset = (subsetId: string, enabled: boolean) => {
    onChange(subsets.map((subset) => (subset.id === subsetId ? { ...subset, enabled } : subset)));
  };

  const deleteSubset = (subsetId: string) => {
    onChange(subsets.filter((subset) => subset.id !== subsetId));
  };

  return (
    <div data-test-subj="entityCentricLabEditFlyoutSubsetsStep">
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsets.intro', {
            defaultMessage:
              'You can define subsets of entity types that would override some settings.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsets.listHeader', {
                defaultMessage:
                  '{count, plural, one {# subset} other {# subsets}} for {entityTypeName}',
                values: { count: subsets.length, entityTypeName: entityType.name },
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plusInCircleFilled"
            onClick={onAddSubset}
            data-test-subj="entityCentricLabEditFlyoutSubsetsAddButton"
          >
            {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsets.addButton', {
              defaultMessage: 'Add a subset',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {subsets.length === 0 ? (
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <EuiEmptyPrompt
            iconType="filter"
            titleSize="xs"
            title={
              <h4>
                {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsets.emptyTitle', {
                  defaultMessage: 'No subsets defined yet',
                })}
              </h4>
            }
            body={
              <EuiText size="s">
                <p>
                  {i18n.translate('xpack.streams.entityCentricLab.editFlyout.subsets.emptyBody', {
                    defaultMessage:
                      'Subsets let you override health, ownership or flyout content for a slice of this entity type.',
                  })}
                </p>
              </EuiText>
            }
            actions={
              <EuiButton
                iconType="plusInCircleFilled"
                onClick={onAddSubset}
                data-test-subj="entityCentricLabEditFlyoutSubsetsEmptyAddButton"
              >
                {i18n.translate(
                  'xpack.streams.entityCentricLab.editFlyout.subsets.emptyAddButton',
                  {
                    defaultMessage: 'Add a subset',
                  }
                )}
              </EuiButton>
            }
          />
        </EuiPanel>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {subsets.map((subset) => (
            <EuiFlexItem key={subset.id} grow={false}>
              <EuiPanel hasBorder hasShadow={false} paddingSize="m">
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  <EuiFlexItem>
                    <EuiTitle size="xxs">
                      <h4>{subset.name || subset.id}</h4>
                    </EuiTitle>
                    <EuiText size="xs" color="subdued">
                      <p>{subset.description}</p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      showLabel={false}
                      label={i18n.translate(
                        'xpack.streams.entityCentricLab.editFlyout.subsets.toggleAriaLabel',
                        {
                          defaultMessage: 'Enable subset {name}',
                          values: { name: subset.name || subset.id },
                        }
                      )}
                      checked={subset.enabled}
                      onChange={(event) => toggleSubset(subset.id, event.target.checked)}
                      data-test-subj={`entityCentricLabEditFlyoutSubsetsToggle-${subset.id}`}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="pencil"
                      onClick={() => onEditSubset(subset.id)}
                      aria-label={i18n.translate(
                        'xpack.streams.entityCentricLab.editFlyout.subsets.editAriaLabel',
                        {
                          defaultMessage: 'Edit subset {name}',
                          values: { name: subset.name || subset.id },
                        }
                      )}
                      data-test-subj={`entityCentricLabEditFlyoutSubsetsEdit-${subset.id}`}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      onClick={() => deleteSubset(subset.id)}
                      aria-label={i18n.translate(
                        'xpack.streams.entityCentricLab.editFlyout.subsets.deleteAriaLabel',
                        {
                          defaultMessage: 'Delete subset {name}',
                          values: { name: subset.name || subset.id },
                        }
                      )}
                      data-test-subj={`entityCentricLabEditFlyoutSubsetsDelete-${subset.id}`}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </div>
  );
};
