/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { isEmptyDocument, type AppDocument } from '@kbn/custom-app-common';
import { EmptyApp } from '../components/empty_app';
import { LiveApp } from '../components/live_app';
import { createDefaultDocument, createEmptyDocument } from '../default_document';
import { DetailsModal } from './details_modal';
import { useChatWithPage } from './use_chat_with_page';
import { useListBack, useListBreadcrumb } from './list_breadcrumb';
import { useUnsavedChangesGuard } from './use_unsaved_changes_guard';
import type { AppServices } from './app';

const toMessage = (error: unknown): string =>
  (error as { body?: { message?: string } })?.body?.message ??
  (error instanceof Error ? error.message : String(error));

/**
 * A new app, as a dashboard does it: it is put together on the page, with nothing saved, and gets
 * a name, and an id, when Save is pressed. What the agent makes only changes the draft, so leaving
 * before that leaves nothing behind.
 */
export const CreatePage = ({
  client,
  chrome,
  notifications,
  agentBuilder,
  onAppLeave,
}: AppServices) => {
  const history = useHistory();
  const [draft, setDraft] = useState<AppDocument>(() => createEmptyDocument());
  const [isNaming, setIsNaming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /** Set once the app is saved: the page is left for it, and nothing is unsaved any more. */
  const [savedId, setSavedId] = useState<string>();

  const isEmpty = isEmptyDocument(draft);
  useUnsavedChangesGuard(!isEmpty && savedId === undefined, onAppLeave);

  useEffect(() => {
    // Replaced, not pushed: going back from the saved app should not return to a new one. This
    // runs after the guard has let go, as the app is no longer unsaved.
    if (savedId) history.replace(`/view/${encodeURIComponent(savedId)}`);
  }, [history, savedId]);

  const listBack = useListBack();
  const listBreadcrumb = useListBreadcrumb();
  const breadcrumbs = useMemo(
    () => [
      listBreadcrumb,
      {
        text: i18n.translate('xpack.customApp.standalone.newBreadcrumb', {
          defaultMessage: 'New app',
        }),
      },
    ],
    [listBreadcrumb]
  );

  useEffect(() => {
    chrome.setBreadcrumbs(breadcrumbs);
  }, [chrome, breadcrumbs]);

  // What the agent makes comes back here, as a draft, and not only into the chat.
  const describe = useChatWithPage({
    agentBuilder,
    getDocument: useCallback(() => draft, [draft]),
    onDocument: setDraft,
  });

  const create = useCallback(
    async ({ title, description }: { title: string; description?: string }) => {
      setIsSaving(true);
      try {
        const { id } = await client.create({ title, description, document: draft });
        setSavedId(id);
      } catch (error) {
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.customApp.standalone.createError', {
            defaultMessage: 'The app could not be created',
          }),
          text: toMessage(error),
        });
        setIsSaving(false);
      }
    },
    [client, draft, notifications]
  );

  const menu: AppHeaderMenu = {
    primaryActionItem: {
      id: 'save',
      label: i18n.translate('xpack.customApp.standalone.save', { defaultMessage: 'Save' }),
      iconType: 'save',
      disableButton: isEmpty,
      testId: 'customAppSave',
      run: () => setIsNaming(true),
    },
    items: isEmpty
      ? []
      : [
          ...(describe
            ? [
                {
                  id: 'refine',
                  order: 2,
                  label: i18n.translate('xpack.customApp.standalone.refine', {
                    defaultMessage: 'Refine with AI',
                  }),
                  iconType: 'sparkles',
                  testId: 'customAppRefineWithAi',
                  run: () =>
                    describe(
                      i18n.translate('xpack.customApp.standalone.refinePrompt', {
                        defaultMessage: 'Change this app so that ',
                      })
                    ),
                },
              ]
            : []),
        ],
  };

  return (
    <EuiPageTemplate offset={0} restrictWidth={false} data-test-subj="customAppCreatePage">
      <AppHeader
        back={listBack}
        title={i18n.translate('xpack.customApp.standalone.newTitle', {
          defaultMessage: 'New app',
        })}
        badges={
          isEmpty
            ? undefined
            : [
                {
                  label: i18n.translate('xpack.customApp.standalone.unsaved', {
                    defaultMessage: 'Unsaved',
                  }),
                  color: 'warning',
                },
              ]
        }
        menu={menu}
      />
      <EuiPageTemplate.Section grow>
        {isEmptyDocument(draft) ? (
          <EmptyApp
            canEdit
            onDescribe={
              describe
                ? () =>
                    describe(
                      i18n.translate('xpack.customApp.standalone.describePrompt', {
                        defaultMessage: 'Create a custom app that ',
                      })
                    )
                : undefined
            }
            // The example is the app itself, which can be saved as it is.
            onUseExample={() => setDraft(createDefaultDocument())}
          />
        ) : (
          <LiveApp document={draft} />
        )}
      </EuiPageTemplate.Section>

      {isNaming && (
        <DetailsModal
          heading={i18n.translate('xpack.customApp.standalone.createHeading', {
            defaultMessage: 'Save app',
          })}
          confirmLabel={i18n.translate('xpack.customApp.standalone.createConfirm', {
            defaultMessage: 'Save',
          })}
          isSaving={isSaving}
          onConfirm={create}
          onCancel={() => setIsNaming(false)}
        />
      )}
    </EuiPageTemplate>
  );
};
