/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Grouped-favorites management UI for the super-short-term lab (only reachable
 * when the "Group starred integrations" nested-nav toggle is on).
 *
 * - {@link AddToFavoritesModal}: shown when starring an integration — pick an
 *   existing group, create a new one, or leave it ungrouped.
 * - {@link ManageGroupsModal}: full CRUD — create/rename/delete groups, move
 *   integrations between groups, and unstar.
 *
 * All state lives in the shared favorites store; these are thin editors over
 * its mutation helpers.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  addFavoriteToGroup,
  addFavoriteToNewGroup,
  createGroup,
  deleteGroup,
  getIntegrationSummary,
  moveFavoriteToGroup,
  removeFavoriteIntegration,
  renameGroup,
  setFavoriteIntegration,
  useFavoritesState,
} from '@kbn/entity-centric-lab-flyout';

const NEW_GROUP_OPTION = '__new_group__';
const UNGROUPED_VALUE = '__ungrouped__';

const integrationName = (id: string): string => getIntegrationSummary(id)?.name ?? id;

/**
 * Modal shown when a user stars an integration while grouped favorites are on.
 */
export const AddToFavoritesModal = ({
  integrationId,
  onClose,
}: {
  integrationId: string;
  onClose: () => void;
}) => {
  const { groups } = useFavoritesState();
  const titleId = useGeneratedHtmlId({ prefix: 'addToFavorites' });
  const [selection, setSelection] = useState<string>(UNGROUPED_VALUE);
  const [newGroupName, setNewGroupName] = useState('');

  const selectOptions = useMemo(
    () => [
      {
        value: UNGROUPED_VALUE,
        text: i18n.translate('xpack.streams.entityCentricLab.integrations.groups.ungroupedOption', {
          defaultMessage: 'No group',
        }),
      },
      ...groups.map((group) => ({ value: group.id, text: group.name })),
      {
        value: NEW_GROUP_OPTION,
        text: i18n.translate('xpack.streams.entityCentricLab.integrations.groups.newGroupOption', {
          defaultMessage: 'New group…',
        }),
      },
    ],
    [groups]
  );

  const isNewGroup = selection === NEW_GROUP_OPTION;
  const trimmedNewGroup = newGroupName.trim();
  const confirmDisabled = isNewGroup && trimmedNewGroup.length === 0;

  const onConfirm = () => {
    if (selection === UNGROUPED_VALUE) {
      setFavoriteIntegration(integrationId, true);
    } else if (isNewGroup) {
      addFavoriteToNewGroup(integrationId, trimmedNewGroup);
    } else {
      addFavoriteToGroup(integrationId, selection);
    }
    onClose();
  };

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} maxWidth={420}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.streams.entityCentricLab.integrations.groups.addTitle', {
            defaultMessage: 'Add {name} to favorites',
            values: { name: integrationName(integrationId) },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm component="form">
          <EuiFormRow
            label={i18n.translate(
              'xpack.streams.entityCentricLab.integrations.groups.selectLabel',
              {
                defaultMessage: 'Group',
              }
            )}
            fullWidth
          >
            <EuiSelect
              options={selectOptions}
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
              fullWidth
              data-test-subj="entityCentricLabAddToFavoritesSelect"
            />
          </EuiFormRow>
          {isNewGroup ? (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.entityCentricLab.integrations.groups.newGroupLabel',
                  { defaultMessage: 'Group name' }
                )}
                fullWidth
              >
                <EuiFieldText
                  autoFocus
                  fullWidth
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  data-test-subj="entityCentricLabNewGroupNameField"
                />
              </EuiFormRow>
            </>
          ) : null}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate('xpack.streams.entityCentricLab.integrations.groups.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={onConfirm}
          isDisabled={confirmDisabled}
          data-test-subj="entityCentricLabAddToFavoritesConfirm"
        >
          {i18n.translate('xpack.streams.entityCentricLab.integrations.groups.addConfirm', {
            defaultMessage: 'Add to favorites',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

const MoveSelect = ({
  integrationId,
  currentGroupId,
}: {
  integrationId: string;
  currentGroupId: string | null;
}) => {
  const { groups } = useFavoritesState();
  const options = [
    {
      value: UNGROUPED_VALUE,
      text: i18n.translate('xpack.streams.entityCentricLab.integrations.groups.ungroupedOption', {
        defaultMessage: 'No group',
      }),
    },
    ...groups.map((group) => ({ value: group.id, text: group.name })),
  ];
  return (
    <EuiSelect
      compressed
      options={options}
      value={currentGroupId ?? UNGROUPED_VALUE}
      onChange={(event) => {
        const { value } = event.target;
        moveFavoriteToGroup(integrationId, value === UNGROUPED_VALUE ? null : value);
      }}
      aria-label={i18n.translate('xpack.streams.entityCentricLab.integrations.groups.moveAria', {
        defaultMessage: 'Move {name} to a group',
        values: { name: integrationName(integrationId) },
      })}
      data-test-subj={`entityCentricLabMoveSelect-${integrationId}`}
    />
  );
};

const IntegrationRow = ({
  integrationId,
  currentGroupId,
}: {
  integrationId: string;
  currentGroupId: string | null;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={getIntegrationSummary(integrationId)?.icon ?? 'package'} />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText size="s">{integrationName(integrationId)}</EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false} css={{ minWidth: 160 }}>
      <MoveSelect integrationId={integrationId} currentGroupId={currentGroupId} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        iconType="starFilled"
        color="primary"
        aria-label={i18n.translate('xpack.streams.entityCentricLab.integrations.groups.unstar', {
          defaultMessage: 'Remove {name} from favorites',
          values: { name: integrationName(integrationId) },
        })}
        onClick={() => removeFavoriteIntegration(integrationId)}
        data-test-subj={`entityCentricLabManageUnstar-${integrationId}`}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const GroupEditor = ({ groupId, name }: { groupId: string; name: string }) => {
  const [draftName, setDraftName] = useState(name);
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiFieldText
          compressed
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={() => {
            const trimmed = draftName.trim();
            if (trimmed && trimmed !== name) renameGroup(groupId, trimmed);
            else setDraftName(name);
          }}
          aria-label={i18n.translate(
            'xpack.streams.entityCentricLab.integrations.groups.renameAria',
            { defaultMessage: 'Rename group' }
          )}
          data-test-subj={`entityCentricLabGroupName-${groupId}`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label={i18n.translate('xpack.streams.entityCentricLab.integrations.groups.delete', {
            defaultMessage: 'Delete group (keeps its integrations starred)',
          })}
          onClick={() => deleteGroup(groupId)}
          data-test-subj={`entityCentricLabDeleteGroup-${groupId}`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * Full group management: create/rename/delete groups, move integrations, unstar.
 */
export const ManageGroupsModal = ({ onClose }: { onClose: () => void }) => {
  const { ungrouped, groups } = useFavoritesState();
  const titleId = useGeneratedHtmlId({ prefix: 'manageGroups' });
  const [newGroupName, setNewGroupName] = useState('');

  const onCreateGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    createGroup(trimmed);
    setNewGroupName('');
  };

  const hasFavorites = ungrouped.length > 0 || groups.length > 0;

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} maxWidth={560}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.streams.entityCentricLab.integrations.groups.manageTitle', {
            defaultMessage: 'Manage starred groups',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false}>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.entityCentricLab.integrations.groups.createLabel',
                { defaultMessage: 'New group' }
              )}
              fullWidth
            >
              <EuiFieldText
                fullWidth
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder={i18n.translate(
                  'xpack.streams.entityCentricLab.integrations.groups.createPlaceholder',
                  { defaultMessage: 'e.g. Production' }
                )}
                data-test-subj="entityCentricLabCreateGroupField"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onCreateGroup}
              isDisabled={newGroupName.trim().length === 0}
              data-test-subj="entityCentricLabCreateGroupButton"
            >
              {i18n.translate('xpack.streams.entityCentricLab.integrations.groups.createButton', {
                defaultMessage: 'Create',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        {!hasFavorites ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.entityCentricLab.integrations.groups.empty', {
              defaultMessage: 'Nothing starred yet. Star an integration to start grouping.',
            })}
          </EuiText>
        ) : null}

        {ungrouped.length > 0 ? (
          <>
            <EuiTitle size="xxs">
              <h4>
                {i18n.translate('xpack.streams.entityCentricLab.integrations.groups.ungrouped', {
                  defaultMessage: 'Ungrouped',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="column" gutterSize="s">
              {ungrouped.map((id) => (
                <EuiFlexItem grow={false} key={id}>
                  <IntegrationRow integrationId={id} currentGroupId={null} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        ) : null}

        {groups.map((group) => (
          <React.Fragment key={group.id}>
            <EuiSpacer size="m" />
            <GroupEditor groupId={group.id} name={group.name} />
            <EuiSpacer size="s" />
            {group.integrationIds.length > 0 ? (
              <EuiFlexGroup direction="column" gutterSize="s">
                {group.integrationIds.map((id) => (
                  <EuiFlexItem grow={false} key={id}>
                    <IntegrationRow integrationId={id} currentGroupId={group.id} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ) : (
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.entityCentricLab.integrations.groups.emptyGroup', {
                  defaultMessage: 'No integrations in this group yet.',
                })}
              </EuiText>
            )}
          </React.Fragment>
        ))}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton fill onClick={onClose} data-test-subj="entityCentricLabManageGroupsDone">
          {i18n.translate('xpack.streams.entityCentricLab.integrations.groups.done', {
            defaultMessage: 'Done',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
