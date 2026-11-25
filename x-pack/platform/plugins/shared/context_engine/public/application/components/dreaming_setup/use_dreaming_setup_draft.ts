/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import {
  buildDreamingTemplateConfig,
  type DreamingTemplateConfig,
  type LoadedDreamingTemplate,
} from '../../../../common/dreaming_templates';
import {
  draftBuildsAnything,
  draftOf,
  typesOfDraft,
  type DreamingConfigDraft,
} from '../dreaming_config/dreaming_config_editor';
import { useDreamingTemplates } from '../../hooks/use_dreaming_templates';

/** The template ID for starting from scratch instead of from an example. */
export const CUSTOM_TEMPLATE_ID = 'custom';

const EMPTY_DRAFT: DreamingConfigDraft = draftOf({});

export interface DreamingSetupDraft {
  templates: LoadedDreamingTemplate[];
  isLoading: boolean;
  error: Error | undefined;
  selectedId: string | undefined;
  isCustom: boolean;
  selected: LoadedDreamingTemplate | undefined;
  select: (id: string) => void;
  summary: string;
  setSummary: (next: string) => void;
  draft: DreamingConfigDraft | undefined;
  setDraft: (next: DreamingConfigDraft) => void;
  canApply: boolean;
  buildConfig: () => DreamingTemplateConfig | undefined;
}

export const useDreamingSetupDraft = (): DreamingSetupDraft => {
  const { templates, isLoading, error } = useDreamingTemplates();
  const [pickedId, setPickedId] = useState<string>();
  const [editedSummary, setSummary] = useState<string>();
  const [edited, setEdited] = useState<{ id: string; draft: DreamingConfigDraft }>();
  const selectedId = pickedId ?? templates[0]?.id;
  const isCustom = selectedId === CUSTOM_TEMPLATE_ID;
  const selected = isCustom ? undefined : templates.find(({ id }) => id === selectedId);

  const proposed = useMemo(
    () =>
      isCustom
        ? EMPTY_DRAFT
        : selected
        ? draftOf(selected.dreaming, { entitiesEnabled: false })
        : undefined,
    [isCustom, selected]
  );
  const draft = edited !== undefined && edited.id === selectedId ? edited.draft : proposed;
  const summary = editedSummary ?? (isCustom ? '' : selected?.summary ?? '');

  const select = (id: string) => {
    if (id !== selectedId) {
      setPickedId(id);
      setSummary(undefined);
    }
  };

  const setDraft = (next: DreamingConfigDraft) => {
    if (selectedId === undefined) {
      return;
    }
    setEdited({ id: selectedId, draft: next });
  };

  const canApply = draft !== undefined && draftBuildsAnything(draft);

  const buildConfig = (): DreamingTemplateConfig | undefined => {
    if (!draft) {
      return undefined;
    }
    return buildDreamingTemplateConfig(
      {
        dreaming: { ...(isCustom ? {} : selected?.dreaming), ...typesOfDraft(draft) },
      },
      summary
    );
  };

  return {
    templates,
    isLoading,
    error,
    selectedId,
    isCustom,
    selected,
    select,
    summary,
    setSummary,
    draft,
    setDraft,
    canApply,
    buildConfig,
  };
};
