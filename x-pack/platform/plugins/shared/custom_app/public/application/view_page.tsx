/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useId, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import isEqual from 'lodash/isEqual';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlyout,
  EuiLoadingSpinner,
  EuiPageTemplate,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { appDocumentSchema, isEmptyDocument, type AppDocument } from '@kbn/custom-app-common';
import { EmptyApp } from '../components/empty_app';
import { LiveApp } from '../components/live_app';
import { createDefaultDocument } from '../default_document';
import { EditorFlyout } from '../editor/editor_flyout';
import { DetailsModal } from './details_modal';
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
  describeWithChat,
  onAppLeave,
}: AppServices) => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const flyoutTitleId = useId();
  const discardTitleId = useId();
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /** The draft the editor is showing, so that it is seen on the page before it is saved. */
  const [preview, setPreview] = useState<AppDocument>();
  /** What was applied in the editor and is not saved yet. Absent when the page shows what is saved. */
  const [draft, setDraft] = useState<AppDocument>();
  /** Where the editor starts when it is not from the app: the example. */
  const [seed, setSeed] = useState<AppDocument>();
  const [isDiscarding, setIsDiscarding] = useState(false);

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
  useEffect(() => {
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('xpack.customApp.standalone.breadcrumb', {
          defaultMessage: 'Custom apps',
        }),
        onClick: (event) => {
          event.preventDefault();
          history.push('/');
        },
        href: history.createHref({ pathname: '/' }),
      },
      ...(title ? [{ text: title }] : []),
    ]);
  }, [chrome, history, title]);

  const closeEditor = useCallback(() => {
    setIsEditing(false);
    setPreview(undefined);
    setSeed(undefined);
  }, []);

  useUnsavedChangesGuard(draft !== undefined, onAppLeave);

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

  const describe = describeWithChat
    ? () =>
        describeWithChat(
          i18n.translate('xpack.customApp.standalone.describePrompt', {
            defaultMessage: 'Create a custom app that ',
          })
        )
    : undefined;

  const editButton =
    canSave && state.status === 'ready' ? (
      <EuiButton
        fill={!hasDraft}
        color={hasDraft ? 'text' : 'primary'}
        iconType="pencil"
        isDisabled={isEditing}
        onClick={() => setIsEditing(true)}
        data-test-subj="customAppEdit"
      >
        {i18n.translate('xpack.customApp.standalone.edit', { defaultMessage: 'Edit' })}
      </EuiButton>
    ) : undefined;

  const detailsButton = canSave ? (
    <EuiButtonEmpty
      iconType="pencil"
      onClick={() => setIsEditingDetails(true)}
      data-test-subj="customAppEditDetails"
    >
      {i18n.translate('xpack.customApp.standalone.editDetails', { defaultMessage: 'Name' })}
    </EuiButtonEmpty>
  ) : undefined;

  return (
    <EuiPageTemplate offset={0} restrictWidth={false} data-test-subj="customAppViewPage">
      <EuiPageTemplate.Header
        pageTitle={app.title}
        description={app.description}
        rightSideItems={[
          ...(hasDraft
            ? [
                <EuiButton
                  fill
                  iconType="save"
                  isLoading={isSaving}
                  onClick={saveDraft}
                  data-test-subj="customAppSave"
                >
                  {i18n.translate('xpack.customApp.standalone.save', { defaultMessage: 'Save' })}
                </EuiButton>,
                <EuiButtonEmpty
                  color="text"
                  isDisabled={isSaving}
                  onClick={() => setIsDiscarding(true)}
                  data-test-subj="customAppDiscard"
                >
                  {i18n.translate('xpack.customApp.standalone.discard', {
                    defaultMessage: 'Discard changes',
                  })}
                </EuiButtonEmpty>,
              ]
            : []),
          ...(editButton ? [editButton] : []),
          ...(detailsButton ? [detailsButton] : []),
          ...(hasDraft
            ? [
                <EuiBadge color="warning">
                  {i18n.translate('xpack.customApp.standalone.unsaved', {
                    defaultMessage: 'Unsaved',
                  })}
                </EuiBadge>,
              ]
            : []),
        ]}
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
        ) : isEmptyDocument(preview ?? draft ?? state.document) ? (
          <EmptyApp
            canEdit={canSave}
            onBuild={() => setIsEditing(true)}
            onDescribe={describe}
            onUseExample={() => {
              setSeed(createDefaultDocument());
              setIsEditing(true);
            }}
          />
        ) : (
          <LiveApp document={preview ?? draft ?? state.document} />
        )}
      </EuiPageTemplate.Section>

      {isEditing && state.status === 'ready' && (
        <EuiFlyout
          type="push"
          size={760}
          // The same room the editor has when it opens on a dashboard.
          paddingSize="m"
          // The editor asks before it throws a draft away, so it is left only through its own buttons.
          onClose={() => {}}
          hideCloseButton
          aria-labelledby={flyoutTitleId}
          data-test-subj="customAppEditorFlyout"
        >
          <EditorFlyout
            initialDocument={seed ?? draft ?? state.document}
            ariaLabelledBy={flyoutTitleId}
            onPreview={setPreview}
            onCancel={closeEditor}
            // Applying changes the page, and nothing more: saving is the page's Save.
            onSave={(document) => {
              setDraft(isEqual(document, state.document) ? undefined : document);
              closeEditor();
            }}
          />
        </EuiFlyout>
      )}
      {isEditingDetails && (
        <DetailsModal
          heading={i18n.translate('xpack.customApp.standalone.detailsHeading', {
            defaultMessage: 'Name and description',
          })}
          confirmLabel={i18n.translate('xpack.customApp.standalone.detailsConfirm', {
            defaultMessage: 'Save',
          })}
          initialTitle={app.title}
          initialDescription={app.description}
          isSaving={isSaving}
          onCancel={() => setIsEditingDetails(false)}
          onConfirm={async (details) => {
            if (state.status === 'ready' && (await save(details, state.document))) {
              setIsEditingDetails(false);
            }
          }}
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
