/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import isEqual from 'lodash/isEqual';
import { EuiConfirmModal, EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { KbnDangerCallout } from '@kbn/ui-callout';
import {
  appDocumentSchema,
  CUSTOM_APP_EMBEDDABLE_TYPE,
  isEmptyDocument,
  type AppDocument,
} from '@kbn/custom-app-common';
import { SavedObjectSaveModalDashboard } from '@kbn/presentation-util-plugin/public';
import { EmptyApp } from '../components/empty_app';
import { LiveApp } from '../components/live_app';
import { createDefaultDocument, createEmptyDocument } from '../default_document';
import { useChatWithPage } from './use_chat_with_page';
import { useListBack, useListBreadcrumb } from './list_breadcrumb';
import { useUnsavedChangesGuard } from './use_unsaved_changes_guard';
import type { AppServices } from './app';
import type { SavedApp } from './saved_apps_client';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string; isNotFound: boolean }
  /** Stored, but not an app this build can show. */
  | { status: 'invalid'; app: SavedApp; problems: string[] }
  | { status: 'ready'; app: SavedApp; document: AppDocument };

const toMessage = (error: unknown): string =>
  (error as { body?: { message?: string } })?.body?.message ??
  (error instanceof Error ? error.message : String(error));

const toViewState = (app: SavedApp): ViewState => {
  const parsed = appDocumentSchema.safeParse(app.document);
  return parsed.success
    ? { status: 'ready', app, document: parsed.data }
    : { status: 'invalid', app, problems: parsed.error.issues.map(({ message }) => message) };
};

export const ViewPage = ({
  client,
  chrome,
  notifications,
  canSave,
  agentBuilder,
  onAppLeave,
  stateTransfer,
  canWriteDashboards,
}: AppServices) => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const discardTitleId = useId();
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [isSaving, setIsSaving] = useState(false);
  /** What the agent changed and is not saved yet. Absent when the page shows what is saved. */
  const [draft, setDraft] = useState<AppDocument>();
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isAddingToDashboard, setIsAddingToDashboard] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    setState({ status: 'loading' });
    client
      .get(id)
      .then((app) => isCurrent && setState(toViewState(app)))
      .catch((error) => {
        if (!isCurrent) return;
        setState({
          status: 'error',
          message: toMessage(error),
          isNotFound: (error as { body?: { statusCode?: number } })?.body?.statusCode === 404,
        });
      });
    return () => {
      isCurrent = false;
    };
  }, [client, id]);

  const title =
    state.status === 'ready' || state.status === 'invalid' ? state.app.title : undefined;
  const listBack = useListBack();
  const listBreadcrumb = useListBreadcrumb();
  const breadcrumbs = useMemo(
    () => [listBreadcrumb, ...(title ? [{ text: title }] : [])],
    [listBreadcrumb, title]
  );
  useEffect(() => {
    chrome.setBreadcrumbs(breadcrumbs);
  }, [chrome, breadcrumbs]);

  useUnsavedChangesGuard(draft !== undefined, onAppLeave);

  const savedDocument = state.status === 'ready' ? state.document : undefined;
  const shownDocument = useMemo(
    () => draft ?? savedDocument ?? createEmptyDocument(),
    [draft, savedDocument]
  );
  // What the agent makes comes back here, as a change that is not saved yet.
  const describe = useChatWithPage({
    agentBuilder,
    getDocument: useCallback(
      () => draft ?? savedDocument ?? createEmptyDocument(),
      [draft, savedDocument]
    ),
    onDocument: useCallback(
      (document: AppDocument) => setDraft(isEqual(document, savedDocument) ? undefined : document),
      [savedDocument]
    ),
  });

  const save = useCallback(
    async (details: { title: string; description?: string }, document: AppDocument) => {
      setIsSaving(true);
      try {
        const saved = await client.update(id, { ...details, document });
        // Saving the document saves the draft; saving only the details leaves a draft as it is.
        setState({ status: 'ready', app: saved, document });
        return true;
      } catch (error) {
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.customApp.standalone.saveError', {
            defaultMessage: 'The app could not be saved',
          }),
          text: toMessage(error),
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [client, id, notifications]
  );

  if (state.status === 'loading') {
    return (
      <EuiPageTemplate offset={0} restrictWidth={false}>
        <EuiPageTemplate.Section grow>
          <EuiLoadingSpinner size="xl" />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  }

  if (state.status === 'error') {
    return (
      <EuiPageTemplate offset={0} restrictWidth={false}>
        <EuiPageTemplate.Section>
          <KbnDangerCallout
            size="s"
            announceOnMount={false}
            title={
              state.isNotFound
                ? i18n.translate('xpack.customApp.standalone.notFound', {
                    defaultMessage: 'This app does not exist, or you cannot see it',
                  })
                : i18n.translate('xpack.customApp.standalone.loadError', {
                    defaultMessage: 'The app could not be loaded',
                  })
            }
            actionProps={{
              primary: {
                children: i18n.translate('xpack.customApp.standalone.backToList', {
                  defaultMessage: 'Back to the list',
                }),
                onClick: () => history.push('/'),
              },
            }}
          >
            <p>{state.message}</p>
          </KbnDangerCallout>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  }

  const { app } = state;
  const hasDraft = draft !== undefined;

  const saveDraft = async () => {
    if (state.status !== 'ready' || !draft) return;
    if (await save({ title: app.title, description: app.description }, draft)) {
      setDraft(undefined);
    }
  };

  const addToDashboardTooltip = !canWriteDashboards
    ? i18n.translate('xpack.customApp.standalone.noDashboardAccess', {
        defaultMessage: 'You need dashboard write permissions to add an app to a dashboard.',
      })
    : hasDraft
    ? i18n.translate('xpack.customApp.standalone.saveFirst', {
        defaultMessage: 'Save your changes first: the dashboard shows the saved app.',
      })
    : undefined;

  const addToDashboard = async ({
    dashboardId,
    newTitle,
    newDescription,
  }: {
    dashboardId: string | null;
    newTitle: string;
    newDescription: string;
  }) => {
    setIsAddingToDashboard(false);
    // A link to the saved app, so that the dashboard follows it. The panel is given a title only if
    // it was changed in the modal, as an app that is called what it is called needs none.
    await stateTransfer.navigateToWithEmbeddablePackages('dashboards', {
      state: [
        {
          type: CUSTOM_APP_EMBEDDABLE_TYPE,
          serializedState: {
            ref_id: app.id,
            ...(newTitle && newTitle !== app.title ? { title: newTitle } : {}),
            ...(newDescription && newDescription !== app.description
              ? { description: newDescription }
              : {}),
          },
        },
      ],
      path: dashboardId && dashboardId !== 'new' ? `#/view/${dashboardId}` : '#/create',
    });
  };

  const canRefine =
    canSave && describe && state.status === 'ready' && !isEmptyDocument(draft ?? state.document);

  const menu: AppHeaderMenu = {
    // What the page asks for next: to save what was changed, or else to change it.
    primaryActionItem: hasDraft
      ? {
          id: 'save',
          label: i18n.translate('xpack.customApp.standalone.save', { defaultMessage: 'Save' }),
          iconType: 'save',
          isLoading: isSaving,
          testId: 'customAppSave',
          run: saveDraft,
        }
      : undefined,
    items: [
      ...(canRefine
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
      ...(state.status === 'ready' && !isEmptyDocument(state.document)
        ? [
            {
              id: 'addToDashboard',
              order: 3,
              label: i18n.translate('xpack.customApp.standalone.addToDashboard', {
                defaultMessage: 'Add to dashboard',
              }),
              iconType: 'dashboardApp',
              disableButton: !canWriteDashboards || hasDraft,
              tooltipContent: addToDashboardTooltip,
              testId: 'customAppAddToDashboard',
              run: () => setIsAddingToDashboard(true),
            },
          ]
        : []),
      ...(hasDraft
        ? [
            {
              id: 'discard',
              order: 5,
              overflow: true as const,
              isDestructive: true,
              label: i18n.translate('xpack.customApp.standalone.discard', {
                defaultMessage: 'Discard changes',
              }),
              iconType: 'trash',
              disableButton: isSaving,
              testId: 'customAppDiscard',
              run: () => setIsDiscarding(true),
            },
          ]
        : []),
    ],
  };

  // The header does not ask to save a name that is empty or the same.
  const renameApp = async (name: string): Promise<string | void> => {
    // A draft stays as it is: only the name is saved.
    if (
      state.status === 'ready' &&
      (await save({ title: name, description: app.description }, state.document))
    ) {
      return;
    }
    return i18n.translate('xpack.customApp.standalone.renameError', {
      defaultMessage: 'The name could not be saved.',
    });
  };

  return (
    <EuiPageTemplate offset={0} restrictWidth={false} data-test-subj="customAppViewPage">
      <AppHeader
        back={listBack}
        title={
          canSave && state.status === 'ready'
            ? {
                text: app.title,
                onSave: renameApp,
                ariaLabel: i18n.translate('xpack.customApp.standalone.renameAria', {
                  defaultMessage: 'Name of the app',
                }),
              }
            : app.title
        }
        description={app.description}
        badges={
          hasDraft
            ? [
                {
                  label: i18n.translate('xpack.customApp.standalone.unsaved', {
                    defaultMessage: 'Unsaved',
                  }),
                  color: 'warning',
                },
              ]
            : undefined
        }
        menu={menu}
      />
      <EuiPageTemplate.Section>
        {state.status === 'invalid' ? (
          <KbnDangerCallout
            size="s"
            announceOnMount={false}
            title={i18n.translate('xpack.customApp.standalone.invalidTitle', {
              defaultMessage: 'This app cannot be shown',
            })}
          >
            <ul>
              {state.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </KbnDangerCallout>
        ) : isEmptyDocument(draft ?? state.document) ? (
          <EmptyApp
            canEdit={canSave}
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
          <LiveApp document={shownDocument} appId={app.id} />
        )}
      </EuiPageTemplate.Section>

      {isAddingToDashboard && (
        <SavedObjectSaveModalDashboard
          objectType={i18n.translate('xpack.customApp.standalone.objectType', {
            defaultMessage: 'Custom app',
          })}
          documentInfo={{ title: app.title, description: app.description }}
          canSaveByReference={false}
          onClose={() => setIsAddingToDashboard(false)}
          onSave={addToDashboard}
        />
      )}
      {isDiscarding && (
        <EuiConfirmModal
          aria-labelledby={discardTitleId}
          titleProps={{ id: discardTitleId }}
          title={i18n.translate('xpack.customApp.standalone.discardTitle', {
            defaultMessage: 'Discard your changes?',
          })}
          onCancel={() => setIsDiscarding(false)}
          onConfirm={() => {
            setDraft(undefined);
            setIsDiscarding(false);
          }}
          cancelButtonText={i18n.translate('xpack.customApp.standalone.discardCancel', {
            defaultMessage: 'Keep editing',
          })}
          confirmButtonText={i18n.translate('xpack.customApp.standalone.discardConfirm', {
            defaultMessage: 'Discard changes',
          })}
          buttonColor="danger"
        >
          <p>
            {i18n.translate('xpack.customApp.standalone.discardBody', {
              defaultMessage: 'The app goes back to how it was last saved.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </EuiPageTemplate>
  );
};
