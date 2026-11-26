/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useSelectedKi } from '../../../../hooks/use_selected_ki';
import type { KiReferenceGroup, KiReferenceItem } from './view_ki_document_helpers';
import { getKiConversationHref, type KiGetUrlForApp } from './view_ki_writer_helpers';
import {
  ViewKiSidebarBreakableText,
  ViewKiSidebarDescriptionList,
  ViewKiSidebarSectionTitle,
} from './view_ki_sidebar_primitives';

interface ViewKiReferencesSectionProps {
  groups: KiReferenceGroup[];
}

const groupTitle = ({ relation }: KiReferenceGroup): string => {
  switch (relation) {
    case 'derived_from':
      return i18n.translate('xpack.contextEngine.viewKi.references.derivedFrom', {
        defaultMessage: 'Created from',
      });
    case 'relates_to':
      return i18n.translate('xpack.contextEngine.viewKi.references.relatesTo', {
        defaultMessage: 'Related',
      });
    case 'supersedes':
      return i18n.translate('xpack.contextEngine.viewKi.references.supersedes', {
        defaultMessage: 'Replaces',
      });
    case 'other':
      return i18n.translate('xpack.contextEngine.viewKi.references.other', {
        defaultMessage: 'Other',
      });
    default:
      return relation;
  }
};

interface KiReferenceItemContentProps {
  item: KiReferenceItem;
  onSelectKi?: (id: string) => void;
  conversationHref?: string;
}

const KiReferenceItemContent = ({
  item,
  onSelectKi,
  conversationHref,
}: KiReferenceItemContentProps) => {
  const { uri, description } = item;

  if (item.kind === 'ki') {
    const text = (
      <ViewKiSidebarBreakableText title={description ? uri : undefined}>
        {description || item.id}
      </ViewKiSidebarBreakableText>
    );
    if (onSelectKi) {
      return (
        <EuiLink onClick={() => onSelectKi(item.id)} data-test-subj="contextViewKiReferenceLink">
          {text}
        </EuiLink>
      );
    }
    return text;
  }

  if (item.kind === 'conversation') {
    const text = (
      <ViewKiSidebarBreakableText title={description ? uri : undefined}>
        {description || item.id}
      </ViewKiSidebarBreakableText>
    );
    if (conversationHref) {
      return (
        <EuiLink href={conversationHref} data-test-subj="contextViewKiReferenceLink">
          {text}
        </EuiLink>
      );
    }
    return text;
  }

  return (
    <ViewKiSidebarBreakableText title={description ? uri : undefined}>
      {description || uri}
    </ViewKiSidebarBreakableText>
  );
};

const COLLAPSED_ITEMS_COUNT = 3;

interface KiReferenceGroupItemsProps {
  group: KiReferenceGroup;
  onSelectKi?: (id: string) => void;
  getUrlForApp: KiGetUrlForApp;
}

const KiReferenceGroupItems = ({ group, onSelectKi, getUrlForApp }: KiReferenceGroupItemsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { relation, items } = group;
  const collapsedHiddenCount = items.length - COLLAPSED_ITEMS_COUNT;
  const visibleItems = isExpanded ? items : items.slice(0, COLLAPSED_ITEMS_COUNT);

  return (
    <>
      {visibleItems.map((item, index) => (
        <React.Fragment key={`${relation}-${item.uri}`}>
          {index > 0 ? <EuiSpacer size="s" /> : null}
          <KiReferenceItemContent
            item={item}
            onSelectKi={onSelectKi}
            conversationHref={
              item.kind === 'conversation'
                ? getKiConversationHref(getUrlForApp, item.id)
                : undefined
            }
          />
        </React.Fragment>
      ))}
      {collapsedHiddenCount > 0 ? (
        <>
          <EuiSpacer size="xs" />
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            data-test-subj="contextViewKiReferencesToggle"
          >
            {isExpanded
              ? i18n.translate('xpack.contextEngine.viewKi.references.showLess', {
                  defaultMessage: 'Show less',
                })
              : i18n.translate('xpack.contextEngine.viewKi.references.showMore', {
                  defaultMessage: 'Show {count} more',
                  values: { count: collapsedHiddenCount },
                })}
          </EuiButtonEmpty>
        </>
      ) : null}
    </>
  );
};

export const ViewKiReferencesSection = ({ groups }: ViewKiReferencesSectionProps) => {
  const { selectedKi, selectKi } = useSelectedKi();
  const {
    services: { application },
  } = useKibana();
  const { getUrlForApp } = application;
  const canSelectKi = Boolean(selectedKi?.index);

  const onSelectKi = useCallback(
    (id: string) => {
      const index = selectedKi?.index;
      if (!index) {
        return;
      }
      selectKi({ id, index });
    },
    [selectKi, selectedKi?.index]
  );

  const listItems = useMemo(
    () =>
      groups.map((group) => ({
        title: groupTitle(group),
        description: (
          <KiReferenceGroupItems
            group={group}
            onSelectKi={canSelectKi ? onSelectKi : undefined}
            getUrlForApp={getUrlForApp}
          />
        ),
      })),
    [groups, canSelectKi, onSelectKi, getUrlForApp]
  );

  if (listItems.length === 0) {
    return null;
  }

  return (
    <section data-test-subj="contextViewKiReferencesSection">
      <ViewKiSidebarSectionTitle>
        <FormattedMessage
          id="xpack.contextEngine.viewKi.references.title"
          defaultMessage="References"
        />
      </ViewKiSidebarSectionTitle>
      <EuiSpacer size="s" />
      <ViewKiSidebarDescriptionList
        listItems={listItems}
        data-test-subj="contextViewKiReferencesList"
      />
    </section>
  );
};
