/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type {
  DreamingEntities,
  DreamingEntityType,
  DreamingFactType,
  DreamingTypesConfig,
} from '../../../../common/dreaming';
import { Eyebrow } from '../dreaming_template/eyebrow';
import { EntityTypeModal, FactTypeModal } from './type_modals';

/** The fact and entity types being edited, before they are saved. */
export interface DreamingConfigDraft {
  facts: DreamingFactType[];
  /** Kept while entities are off, so turning them back on restores them. */
  entities: { nodes: DreamingEntityType[] };
  entitiesEnabled: boolean;
}

/** A draft of a saved or proposed config. Entities are on when it has entity types. */
export const draftOf = (
  { facts, entities }: DreamingTypesConfig,
  { entitiesEnabled }: { entitiesEnabled?: boolean } = {}
): DreamingConfigDraft => ({
  facts: facts ?? [],
  entities: { nodes: entities?.nodes ?? [] },
  entitiesEnabled: entitiesEnabled ?? (entities?.nodes ?? []).length > 0,
});

/** The draft as the `facts` and `entities` of a dreaming config; entities off is `null`. */
export const typesOfDraft = ({
  facts,
  entities,
  entitiesEnabled,
}: DreamingConfigDraft): { facts: DreamingFactType[]; entities: DreamingEntities | null } => ({
  facts,
  entities: entitiesEnabled && entities.nodes.length > 0 ? entities : null,
});

/** Whether a draft builds anything: a fact type, or entities that are on. */
export const draftBuildsAnything = (draft: DreamingConfigDraft): boolean => {
  const { facts, entities } = typesOfDraft(draft);
  return facts.length > 0 || entities !== null;
};

const useTypeNameStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    font-family: ${euiTheme.font.familyCode};
    font-weight: ${euiTheme.font.weight.bold};
    font-size: ${euiTheme.size.l};
    color: ${euiTheme.colors.textHeading};
    overflow-wrap: anywhere;
  `;
};

const editLabel = (type: string) =>
  i18n.translate('xpack.contextEngine.dreamingConfig.editAriaLabel', {
    defaultMessage: 'Edit {type}',
    values: { type },
  });

const deleteLabel = (type: string) =>
  i18n.translate('xpack.contextEngine.dreamingConfig.deleteAriaLabel', {
    defaultMessage: 'Delete {type}',
    values: { type },
  });

interface TypeCardProps {
  type: string;
  description?: string;
  footer?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  'data-test-subj': string;
}

const TypeCard = ({
  type,
  description,
  footer,
  onEdit,
  onDelete,
  'data-test-subj': dataTestSubj,
}: TypeCardProps) => {
  const typeNameStyles = useTypeNameStyles();
  return (
    <EuiPanel hasBorder paddingSize="l" css={{ height: '100%' }} data-test-subj={dataTestSubj}>
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <div css={typeNameStyles}>{type}</div>
        </EuiFlexItem>
        {onEdit && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={editLabel(type)} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="pencil"
                color="text"
                onClick={onEdit}
                aria-label={editLabel(type)}
                data-test-subj={`${dataTestSubj}-edit`}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
        {onDelete && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={deleteLabel(type)} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                onClick={onDelete}
                aria-label={deleteLabel(type)}
                data-test-subj={`${dataTestSubj}-delete`}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {description && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
        </>
      )}
      {footer && (
        <>
          <EuiSpacer size="m" />
          {footer}
        </>
      )}
    </EuiPanel>
  );
};

interface SectionProps {
  icon: IconType;
  title: string;
  count: number;
  description: string;
  addLabel: string;
  onAdd?: () => void;
  emptyMessage: string;
  children: React.ReactNode;
  'data-test-subj': string;
}

const Section = ({
  icon,
  title,
  count,
  description,
  addLabel,
  onAdd,
  emptyMessage,
  children,
  'data-test-subj': dataTestSubj,
}: SectionProps) => (
  <section data-test-subj={dataTestSubj}>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={icon} color="subdued" aria-hidden />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Eyebrow>{title}</Eyebrow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiNotificationBadge color="subdued">{count}</EuiNotificationBadge>
      </EuiFlexItem>
      <EuiFlexItem />
      {onAdd && (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="plus"
            onClick={onAdd}
            data-test-subj={`${dataTestSubj}-add`}
          >
            {addLabel}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiText size="s" color="subdued">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="m" />
    {count === 0 ? (
      <EuiText size="s" color="subdued" data-test-subj={`${dataTestSubj}-empty`}>
        <p>{emptyMessage}</p>
      </EuiText>
    ) : (
      <EuiFlexGrid columns={3} gutterSize="m">
        {children}
      </EuiFlexGrid>
    )}
  </section>
);

type Editing = { kind: 'fact'; index?: number } | { kind: 'entity'; index?: number };

const without = <T,>(items: readonly T[], index: number): T[] =>
  items.filter((_, i) => i !== index);

const replaced = <T,>(items: readonly T[], index: number | undefined, item: T): T[] =>
  index === undefined
    ? [...items, item]
    : items.map((current, i) => (i === index ? item : current));

interface DreamingConfigEditorProps {
  draft: DreamingConfigDraft;
  /** Absent for a config that can't be changed here, such as a managed AI index's. */
  onChange?: (draft: DreamingConfigDraft) => void;
  /** Entity types to start from when entities are turned on with none. */
  suggestedEntities?: DreamingEntities;
}

/**
 * What dreaming learns: fact types, then entity types, which are off until turned on. Each type is
 * added and edited in a modal.
 */
export const DreamingConfigEditor = ({
  draft,
  onChange,
  suggestedEntities,
}: DreamingConfigEditorProps) => {
  const [editing, setEditing] = useState<Editing>();
  const { facts, entities, entitiesEnabled } = draft;
  const { nodes } = entities;
  const readOnly = onChange === undefined;
  const update = (next: Partial<DreamingConfigDraft>) => onChange?.({ ...draft, ...next });
  const close = () => setEditing(undefined);

  const toggleEntities = (enabled: boolean) =>
    update({
      entitiesEnabled: enabled,
      ...(enabled &&
        nodes.length === 0 &&
        suggestedEntities && { entities: { nodes: suggestedEntities.nodes } }),
    });

  const takenBy = (types: string[], index: number | undefined) =>
    types.filter((_, i) => i !== index);

  return (
    <div data-test-subj="contextDreamingConfigEditor">
      <Section
        icon="document"
        title={i18n.translate('xpack.contextEngine.dreamingConfig.factsTitle', {
          defaultMessage: 'Fact types',
        })}
        count={facts.length}
        description={i18n.translate('xpack.contextEngine.dreamingConfig.factsDescription', {
          defaultMessage:
            'What dreaming writes down: the kinds of knowledge your agent can recall later.',
        })}
        addLabel={i18n.translate('xpack.contextEngine.dreamingConfig.addFact', {
          defaultMessage: 'Add fact type',
        })}
        onAdd={readOnly ? undefined : () => setEditing({ kind: 'fact' })}
        emptyMessage={i18n.translate('xpack.contextEngine.dreamingConfig.factsEmpty', {
          defaultMessage: 'No fact types yet. Add one for dreaming to start writing facts.',
        })}
        data-test-subj="contextDreamingConfigFacts"
      >
        {facts.map(({ type, description }, index) => (
          <EuiFlexItem key={type}>
            <TypeCard
              type={type}
              description={description}
              {...(!readOnly && {
                onEdit: () => setEditing({ kind: 'fact', index }),
                onDelete: () => update({ facts: without(facts, index) }),
              })}
              data-test-subj={`contextDreamingConfigFact-${type}`}
            />
          </EuiFlexItem>
        ))}
      </Section>
      <EuiHorizontalRule margin="xl" />
      <EuiSwitch
        label={i18n.translate('xpack.contextEngine.dreamingConfig.entitiesSwitch', {
          defaultMessage: 'Also learn entities',
        })}
        checked={entitiesEnabled}
        disabled={readOnly}
        onChange={(event) => toggleEntities(event.target.checked)}
        data-test-subj="contextDreamingConfigEntitiesSwitch"
      />
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.contextEngine.dreamingConfig.entitiesSwitchDescription', {
            defaultMessage:
              'Entities are the things your memories are about, each with a summary of what is known about it. Turn them on once facts are useful, or now.',
          })}
        </p>
      </EuiText>
      {entitiesEnabled && (
        <>
          <EuiSpacer size="l" />
          <Section
            icon="cube"
            title={i18n.translate('xpack.contextEngine.dreamingConfig.entitiesTitle', {
              defaultMessage: 'Entity types',
            })}
            count={nodes.length}
            description={i18n.translate('xpack.contextEngine.dreamingConfig.entitiesDescription', {
              defaultMessage: 'The things your agent remembers: the nouns of your domain.',
            })}
            addLabel={i18n.translate('xpack.contextEngine.dreamingConfig.addEntity', {
              defaultMessage: 'Add entity type',
            })}
            onAdd={readOnly ? undefined : () => setEditing({ kind: 'entity' })}
            emptyMessage={i18n.translate('xpack.contextEngine.dreamingConfig.entitiesEmpty', {
              defaultMessage: 'No entity types yet. Add one, such as customer or product.',
            })}
            data-test-subj="contextDreamingConfigEntities"
          >
            {nodes.map(({ type, description, attributes = [] }, index) => (
              <EuiFlexItem key={type}>
                <TypeCard
                  type={type}
                  description={description}
                  footer={
                    attributes.length > 0 && (
                      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                        {attributes.map((attribute) => (
                          <EuiFlexItem grow={false} key={attribute}>
                            <EuiCode>{attribute}</EuiCode>
                          </EuiFlexItem>
                        ))}
                      </EuiFlexGroup>
                    )
                  }
                  {...(!readOnly && {
                    onEdit: () => setEditing({ kind: 'entity', index }),
                    onDelete: () => update({ entities: { nodes: without(nodes, index) } }),
                  })}
                  data-test-subj={`contextDreamingConfigEntity-${type}`}
                />
              </EuiFlexItem>
            ))}
          </Section>
        </>
      )}
      {editing?.kind === 'fact' && (
        <FactTypeModal
          initial={editing.index !== undefined ? facts[editing.index] : undefined}
          taken={takenBy(
            facts.map(({ type }) => type),
            editing.index
          )}
          onSave={(fact) => {
            update({ facts: replaced(facts, editing.index, fact) });
            close();
          }}
          onClose={close}
        />
      )}
      {editing?.kind === 'entity' && (
        <EntityTypeModal
          initial={editing.index !== undefined ? nodes[editing.index] : undefined}
          taken={takenBy(
            nodes.map(({ type }) => type),
            editing.index
          )}
          onSave={(entity) => {
            update({ entities: { nodes: replaced(nodes, editing.index, entity) } });
            close();
          }}
          onClose={close}
        />
      )}
    </div>
  );
};
