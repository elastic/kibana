/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import type { AgentsServiceStartContract } from '@kbn/agent-builder-browser';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import { SKILL_ATTACHMENT_TYPE, type SkillAttachment } from '../../../common/attachments';
import { createSkillAttachmentDefinition } from './skill_attachment';

jest.mock('@kbn/agent-builder-plugin/public', () => ({
  SKILLS_API_PATH: '/api/agent_builder/skills',
  AGENTBUILDER_APP_ID: 'agent_builder',
}));

jest.mock('./skill_diff_viewer', () => ({
  SkillDiffViewer: ({
    beforeContent,
    afterContent,
  }: {
    beforeContent: string;
    afterContent: string;
  }) => (
    <div
      data-test-subj="skillDiffViewerStub"
      data-before={beforeContent}
      data-after={afterContent}
    />
  ),
}));

const SHOW_DIFF_LABEL = 'Show diff';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <IntlProvider locale="en">
      <EuiProvider>{ui}</EuiProvider>
    </IntlProvider>
  );

const CREATE_BUTTON_LABEL = 'Create skill';
const SAVE_CHANGES_LABEL = 'Save changes';
const EDIT_IN_MANAGEMENT_LABEL = 'Edit in Management';
const NEW_SKILL_ID = 'track-purchases';

const TIMESTAMP_A = '2024-01-01T00:00:00.000Z';
const TIMESTAMP_B = '2024-01-02T00:00:00.000Z';

const buildSkillData = () => ({
  id: NEW_SKILL_ID,
  name: 'Track purchases',
  description: 'Tracks small purchases',
  content: 'instructions',
  tool_ids: [] as string[],
  referenced_content: [] as Array<{ name: string; relativePath: string; content: string }>,
});

/** Draft create attachment — latest version, not yet persisted. */
const buildCreateAttachment = (): SkillAttachment =>
  ({
    id: 'attachment-1',
    type: SKILL_ATTACHMENT_TYPE,
    data: { mode: 'create', skill: buildSkillData(), originalContent: 'instructions' },
    versionData: { version: 1, versionCount: 1, createdAt: TIMESTAMP_A },
  } as unknown as SkillAttachment);

/** Create attachment that has been patched — current content differs from first draft. */
const buildPatchedCreateAttachment = (): SkillAttachment =>
  ({
    id: 'attachment-1',
    type: SKILL_ATTACHMENT_TYPE,
    data: {
      mode: 'create',
      skill: { ...buildSkillData(), content: 'updated instructions' },
      originalContent: 'instructions',
    },
    versionData: { version: 2, versionCount: 2, createdAt: TIMESTAMP_B },
  } as unknown as SkillAttachment);

/** Create attachment after the skill was successfully created (committed). */
const buildCreatedCommittedAttachment = (): SkillAttachment =>
  ({
    id: 'attachment-1',
    type: SKILL_ATTACHMENT_TYPE,
    origin: NEW_SKILL_ID,
    data: {
      mode: 'create',
      skill: { ...buildSkillData(), content: 'updated instructions' },
      originalContent: 'instructions',
    },
    versionData: {
      version: 2,
      versionCount: 2,
      createdAt: TIMESTAMP_B,
      originSyncedAt: TIMESTAMP_B,
    },
  } as unknown as SkillAttachment);

/** Edit attachment freshly loaded by the agent — committed (no draft changes). */
const buildLoadedEditAttachment = (): SkillAttachment =>
  ({
    id: 'attachment-1',
    type: SKILL_ATTACHMENT_TYPE,
    origin: NEW_SKILL_ID,
    data: { mode: 'edit', skill: buildSkillData(), originalContent: 'instructions' },
    versionData: {
      version: 1,
      versionCount: 1,
      createdAt: TIMESTAMP_A,
      originSyncedAt: TIMESTAMP_A,
    },
  } as unknown as SkillAttachment);

/** Edit attachment with draft changes applied — not committed. */
const buildDirtyEditAttachment = (): SkillAttachment =>
  ({
    id: 'attachment-1',
    type: SKILL_ATTACHMENT_TYPE,
    origin: NEW_SKILL_ID,
    data: {
      mode: 'edit',
      skill: { ...buildSkillData(), content: 'updated instructions' },
      originalContent: 'instructions',
    },
    versionData: {
      version: 2,
      versionCount: 2,
      createdAt: TIMESTAMP_B,
      originSyncedAt: TIMESTAMP_A,
    },
  } as unknown as SkillAttachment);

/** Edit attachment after Save — committed, versionCount > 1. */
const buildSavedEditAttachment = (): SkillAttachment =>
  ({
    id: 'attachment-1',
    type: SKILL_ATTACHMENT_TYPE,
    origin: NEW_SKILL_ID,
    data: {
      mode: 'edit',
      skill: { ...buildSkillData(), content: 'updated instructions' },
      originalContent: 'instructions',
    },
    versionData: {
      version: 2,
      versionCount: 2,
      createdAt: TIMESTAMP_B,
      originSyncedAt: TIMESTAMP_B,
    },
  } as unknown as SkillAttachment);

/** Older (non-latest) committed version — e.g. viewing a previous round's render. */
const buildOldCommittedAttachment = (): SkillAttachment =>
  ({
    id: 'attachment-1',
    type: SKILL_ATTACHMENT_TYPE,
    origin: NEW_SKILL_ID,
    data: { mode: 'edit', skill: buildSkillData(), originalContent: 'instructions' },
    versionData: {
      version: 1,
      versionCount: 3,
      createdAt: TIMESTAMP_A,
      originSyncedAt: TIMESTAMP_A,
    },
  } as unknown as SkillAttachment);

const setup = () => {
  const post = jest.fn().mockResolvedValue({ id: NEW_SKILL_ID });
  const addSuccess = jest.fn();
  const addError = jest.fn();
  const addSkillToAgent = jest.fn().mockResolvedValue({});
  const updateOrigin = jest.fn().mockResolvedValue(undefined);

  const http = { post } as unknown as HttpStart;
  const notifications = {
    toasts: { addSuccess, addError },
  } as unknown as CoreStart['notifications'];
  const application = {
    capabilities: { agentBuilder: { manageSkills: true } },
    getUrlForApp: jest.fn(),
  } as unknown as CoreStart['application'];
  const agents = { list: jest.fn(), addSkillToAgent } as unknown as AgentsServiceStartContract;

  const definition = createSkillAttachmentDefinition({ http, notifications, application, agents });

  const getButtons = (attachment: SkillAttachment, agentId?: string): ActionButton[] =>
    definition.getActionButtons?.({
      attachment,
      agentId,
      isSidebar: false,
      isCanvas: false,
      updateOrigin,
    }) ?? [];

  const getCreateHandler = (agentId?: string) => {
    const buttons = getButtons(buildCreateAttachment(), agentId);
    const createButton = buttons.find((button) => button.label === CREATE_BUTTON_LABEL);
    if (!createButton) {
      throw new Error('Create skill button not found');
    }
    return createButton.handler;
  };

  const getHeader = (attachment: SkillAttachment) => definition.getHeader?.({ attachment });

  return {
    post,
    addSuccess,
    addError,
    addSkillToAgent,
    updateOrigin,
    getCreateHandler,
    getButtons,
    getHeader,
    definition,
  };
};

describe('createSkillAttachmentDefinition - Create skill', () => {
  it('creates the skill and adds it to the current agent', async () => {
    const { post, addSuccess, addError, addSkillToAgent, updateOrigin, getCreateHandler } = setup();

    await getCreateHandler('agent-1')();

    expect(post).toHaveBeenCalledWith('/api/agent_builder/skills', expect.any(Object));
    expect(updateOrigin).toHaveBeenCalledWith(NEW_SKILL_ID);
    expect(addSkillToAgent).toHaveBeenCalledWith({ agentId: 'agent-1', skillId: NEW_SKILL_ID });
    expect(addSuccess).toHaveBeenCalledTimes(1);
    expect(addError).not.toHaveBeenCalled();
  });

  it('creates the skill without attaching when there is no current agent', async () => {
    const { addSkillToAgent, addSuccess, addError, getCreateHandler } = setup();

    await getCreateHandler(undefined)();

    expect(addSkillToAgent).not.toHaveBeenCalled();
    expect(addSuccess).toHaveBeenCalledTimes(1);
    expect(addError).not.toHaveBeenCalled();
  });

  it('keeps the created skill and reports separately when attaching to the agent fails', async () => {
    const { addSkillToAgent, addSuccess, addError, updateOrigin, getCreateHandler } = setup();
    addSkillToAgent.mockRejectedValueOnce(new Error('forbidden'));

    await getCreateHandler('agent-1')();

    expect(updateOrigin).toHaveBeenCalledWith(NEW_SKILL_ID);
    expect(addSkillToAgent).toHaveBeenCalledWith({ agentId: 'agent-1', skillId: NEW_SKILL_ID });
    expect(addError).toHaveBeenCalledTimes(1);
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('does not attempt to attach when skill creation fails', async () => {
    const { post, addSkillToAgent, addSuccess, addError, getCreateHandler } = setup();
    post.mockRejectedValueOnce(new Error('boom'));

    await getCreateHandler('agent-1')();

    expect(addSkillToAgent).not.toHaveBeenCalled();
    expect(addSuccess).not.toHaveBeenCalled();
    expect(addError).toHaveBeenCalledTimes(1);
  });
});

describe('createSkillAttachmentDefinition - edit mode (freshly loaded, no draft changes)', () => {
  it('shows "Edit in Management" and no "Save changes" button', () => {
    const { getButtons } = setup();
    const buttons = getButtons(buildLoadedEditAttachment());
    const labels = buttons.map((b) => b.label);

    expect(labels).toContain(EDIT_IN_MANAGEMENT_LABEL);
    expect(labels).not.toContain(SAVE_CHANGES_LABEL);
    expect(labels).not.toContain(CREATE_BUTTON_LABEL);
  });

  it('shows no committed badge in the header', () => {
    const { getHeader } = setup();
    const header = getHeader(buildLoadedEditAttachment());

    expect(header?.badges).toEqual([]);
  });
});

describe('createSkillAttachmentDefinition - edit mode (dirty draft, pending save)', () => {
  it('shows "Save changes" and no "Edit in Management" button', () => {
    const { getButtons } = setup();
    const buttons = getButtons(buildDirtyEditAttachment());
    const labels = buttons.map((b) => b.label);

    expect(labels).toContain(SAVE_CHANGES_LABEL);
    expect(labels).not.toContain(EDIT_IN_MANAGEMENT_LABEL);
  });

  it('shows Draft and Latest badges in the header', () => {
    const { getHeader } = setup();
    const header = getHeader(buildDirtyEditAttachment());
    const labels = header?.badges?.map((b) => b.label) ?? [];

    expect(labels).toContain('Draft');
    expect(labels).toContain('Latest');
  });
});

describe('createSkillAttachmentDefinition - edit mode (saved after edits)', () => {
  it('shows "Edit in Management" and no "Save changes" button', () => {
    const { getButtons } = setup();
    const buttons = getButtons(buildSavedEditAttachment());
    const labels = buttons.map((b) => b.label);

    expect(labels).toContain(EDIT_IN_MANAGEMENT_LABEL);
    expect(labels).not.toContain(SAVE_CHANGES_LABEL);
  });

  it('shows "Saved" badge in the header', () => {
    const { getHeader } = setup();
    const header = getHeader(buildSavedEditAttachment());
    const labels = header?.badges?.map((b) => b.label) ?? [];

    expect(labels).toContain('Saved');
  });
});

describe('createSkillAttachmentDefinition - edit mode (older committed version)', () => {
  it('shows no action buttons', () => {
    const { getButtons } = setup();
    const buttons = getButtons(buildOldCommittedAttachment());
    const labels = buttons.map((b) => b.label);

    expect(labels).not.toContain(EDIT_IN_MANAGEMENT_LABEL);
    expect(labels).not.toContain(SAVE_CHANGES_LABEL);
    expect(labels).not.toContain(CREATE_BUTTON_LABEL);
  });

  it('shows no badge', () => {
    const { getHeader } = setup();
    const header = getHeader(buildOldCommittedAttachment());

    expect(header?.badges).toEqual([]);
  });
});

describe('createSkillAttachmentDefinition - instructions diff visibility', () => {
  const renderInline = (attachment: SkillAttachment) => {
    const { definition } = setup();
    return renderWithProviders(
      <>{definition.renderInlineContent?.({ attachment, isSidebar: false })}</>
    );
  };

  it('hides the "Show diff" switch on a fresh create draft (no edits yet)', () => {
    renderInline(buildCreateAttachment());
    expect(screen.queryByText(SHOW_DIFF_LABEL)).not.toBeInTheDocument();
  });

  it('shows the "Show diff" switch on a patched create draft (diverges from first draft)', () => {
    renderInline(buildPatchedCreateAttachment());
    expect(screen.getByText(SHOW_DIFF_LABEL)).toBeInTheDocument();
  });

  it('hides the "Show diff" switch on a created (committed) attachment', () => {
    renderInline(buildCreatedCommittedAttachment());
    expect(screen.queryByText(SHOW_DIFF_LABEL)).not.toBeInTheDocument();
  });

  it('hides the "Show diff" switch on a freshly loaded edit attachment (content matches persisted)', () => {
    renderInline(buildLoadedEditAttachment());
    expect(screen.queryByText(SHOW_DIFF_LABEL)).not.toBeInTheDocument();
  });

  it('shows the "Show diff" switch on a dirty edit draft (pending save)', () => {
    renderInline(buildDirtyEditAttachment());
    expect(screen.getByText(SHOW_DIFF_LABEL)).toBeInTheDocument();
  });

  it('hides the "Show diff" switch on a saved edit attachment (post-save, content matches persisted)', () => {
    renderInline(buildSavedEditAttachment());
    expect(screen.queryByText(SHOW_DIFF_LABEL)).not.toBeInTheDocument();
  });
});
