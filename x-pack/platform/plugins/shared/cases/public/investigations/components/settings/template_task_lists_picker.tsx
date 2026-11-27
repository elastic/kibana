/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { MAX_TASK_LISTS_PER_TEMPLATE } from '../../../../common/investigations/constants';
import type { TaskList } from '../../../../common/investigations/types';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import {
  getHttpErrorMessage,
  useInvestigationToasts,
  useSaveTemplateTaskLists,
  useTaskLists,
  useTemplateTaskLists,
} from '../../hooks';
import { ICONS } from '../../icons';
import { ErrorState, LoadingState } from '../shared';
import { TaskListEditor } from './task_list_editor';
import * as i18n from './translations';

export interface TemplateTaskListsPickerProps {
  templateId: string;
  templateName: string;
  onClose: () => void;
}

const countTasks = (taskList: TaskList): number =>
  taskList.tasks.reduce((total, task) => total + 1 + (task.subtasks?.length ?? 0), 0);

/**
 * Chooses and orders the task lists a template adds to a new investigation (at most ten), and
 * creates a new list on the spot that is added to the selection.
 */
export const TemplateTaskListsPicker: React.FC<TemplateTaskListsPickerProps> = ({
  templateId,
  templateName,
  onClose,
}) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const { permissions } = useCasesContext();
  const { showSuccess } = useInvestigationToasts();
  const linksQuery = useTemplateTaskLists(templateId);
  const taskListsQuery = useTaskLists();
  const saveLinks = useSaveTemplateTaskLists();

  const [selected, setSelected] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canManage = permissions.settings;
  const taskLists = useMemo(() => taskListsQuery.data?.task_lists ?? [], [taskListsQuery.data]);
  const byId = useMemo(() => new Map(taskLists.map((list) => [list.id, list])), [taskLists]);

  // Take the saved links once, so that refetches never undo the edits in progress.
  useEffect(() => {
    if (initialized || !linksQuery.data) {
      return;
    }
    setSelected(linksQuery.data.task_list_ids);
    setInitialized(true);
  }, [initialized, linksQuery.data]);

  const linkedLists = selected.flatMap((id) => byId.get(id) ?? []);
  const available = taskLists.filter((list) => !selected.includes(list.id));
  const isFull = selected.length >= MAX_TASK_LISTS_PER_TEMPLATE;

  const move = (index: number, offset: -1 | 1) =>
    setSelected((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const handleSave = async () => {
    setSaveError(null);
    try {
      await saveLinks.mutateAsync({
        templateId,
        taskListIds: linkedLists.map((list) => list.id),
      });
      showSuccess(i18n.PICKER_SAVED(templateName));
      onClose();
    } catch (error) {
      setSaveError(getHttpErrorMessage(error));
    }
  };

  if (isCreating) {
    return (
      <TaskListEditor
        silent
        onClose={() => setIsCreating(false)}
        onSaved={(created) =>
          setSelected((current) =>
            current.includes(created.id) || current.length >= MAX_TASK_LISTS_PER_TEMPLATE
              ? current
              : [...current, created.id]
          )
        }
      />
    );
  }

  const renderBody = () => {
    if (linksQuery.isLoading || taskListsQuery.isLoading || !initialized) {
      if (linksQuery.isError || taskListsQuery.isError) {
        return (
          <ErrorState
            title={i18n.PICKER_LOAD_ERROR}
            error={linksQuery.error ?? taskListsQuery.error}
            onRetry={() => {
              void linksQuery.refetch();
              void taskListsQuery.refetch();
            }}
          />
        );
      }
      return <LoadingState label={i18n.TASK_LISTS_LOADING} />;
    }
    return (
      <>
        {canManage ? null : (
          <>
            <EuiCallOut
              announceOnMount={false}
              size="s"
              iconType={ICONS.lock}
              title={i18n.TASK_LISTS_READ_ONLY}
              data-test-subj="investigationTemplateTaskListsReadOnly"
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiTitle size="xxs">
          <h3 data-test-subj="investigationTemplateTaskListsLinkedTitle">
            {i18n.PICKER_LINKED(linkedLists.length, MAX_TASK_LISTS_PER_TEMPLATE)}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {linkedLists.length === 0 ? (
          <EuiText size="s" color="subdued" data-test-subj="investigationTemplateTaskListsNone">
            <p>{i18n.PICKER_NONE_LINKED}</p>
          </EuiText>
        ) : (
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            responsive={false}
            data-test-subj="investigationTemplateTaskListsLinked"
          >
            {linkedLists.map((list, index) => (
              <EuiFlexItem grow={false} key={list.id}>
                <EuiPanel
                  paddingSize="s"
                  hasShadow={false}
                  hasBorder
                  data-test-subj={`investigationTemplateTaskListLinked-${index}`}
                >
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{index + 1}</EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{list.name}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.TASK_COUNT(countTasks(list))}
                      </EuiText>
                    </EuiFlexItem>
                    {canManage ? (
                      <>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip
                            content={i18n.PICKER_MOVE_UP_ARIA(list.name)}
                            disableScreenReaderOutput
                          >
                            <EuiButtonIcon
                              iconType={ICONS.sortAscending}
                              aria-label={i18n.PICKER_MOVE_UP_ARIA(list.name)}
                              isDisabled={index === 0}
                              onClick={() => move(index, -1)}
                              data-test-subj={`investigationTemplateTaskListUp-${index}`}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip
                            content={i18n.PICKER_MOVE_DOWN_ARIA(list.name)}
                            disableScreenReaderOutput
                          >
                            <EuiButtonIcon
                              iconType={ICONS.sortDescending}
                              aria-label={i18n.PICKER_MOVE_DOWN_ARIA(list.name)}
                              isDisabled={index === linkedLists.length - 1}
                              onClick={() => move(index, 1)}
                              data-test-subj={`investigationTemplateTaskListDown-${index}`}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip
                            content={i18n.PICKER_REMOVE_ARIA(list.name)}
                            disableScreenReaderOutput
                          >
                            <EuiButtonIcon
                              iconType={ICONS.close}
                              color="danger"
                              aria-label={i18n.PICKER_REMOVE_ARIA(list.name)}
                              onClick={() =>
                                setSelected((current) => current.filter((id) => id !== list.id))
                              }
                              data-test-subj={`investigationTemplateTaskListRemove-${index}`}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      </>
                    ) : null}
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
        {isFull ? (
          <EuiText size="xs" color="subdued" data-test-subj="investigationTemplateTaskListsMax">
            <p>{i18n.PICKER_MAX(MAX_TASK_LISTS_PER_TEMPLATE)}</p>
          </EuiText>
        ) : null}
        <EuiSpacer size="l" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>{i18n.PICKER_AVAILABLE}</h3>
            </EuiTitle>
          </EuiFlexItem>
          {canManage ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType={ICONS.add}
                onClick={() => setIsCreating(true)}
                data-test-subj="investigationTemplateTaskListsCreate"
              >
                {i18n.PICKER_CREATE}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {available.length === 0 ? (
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="investigationTemplateTaskListsNoneAvailable"
          >
            <p>{taskLists.length === 0 ? i18n.TASK_LISTS_EMPTY : i18n.PICKER_NONE_AVAILABLE}</p>
          </EuiText>
        ) : (
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            responsive={false}
            data-test-subj="investigationTemplateTaskListsAvailable"
          >
            {available.map((list) => (
              <EuiFlexItem grow={false} key={list.id}>
                <EuiPanel
                  paddingSize="s"
                  hasShadow={false}
                  hasBorder
                  data-test-subj={`investigationTemplateTaskListOption-${list.id}`}
                >
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{list.name}</strong>
                      </EuiText>
                      {list.description ? (
                        <EuiText size="xs" color="subdued">
                          {list.description}
                        </EuiText>
                      ) : null}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.TASK_COUNT(countTasks(list))}
                      </EuiText>
                    </EuiFlexItem>
                    {canManage ? (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          size="xs"
                          iconType={ICONS.add}
                          isDisabled={isFull}
                          aria-label={i18n.PICKER_ADD_ARIA(list.name)}
                          onClick={() => setSelected((current) => [...current, list.id])}
                          data-test-subj={`investigationTemplateTaskListAdd-${list.id}`}
                        >
                          {i18n.PICKER_ADD}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
        {saveError ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.PICKER_SAVE_ERROR}
              text={<p>{saveError}</p>}
              data-test-subj="investigationTemplateTaskListsSaveError"
            />
          </>
        ) : null}
      </>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      ownFocus
      aria-labelledby={flyoutTitleId}
      data-test-subj="investigationTemplateTaskLists"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{i18n.PICKER_TITLE(templateName)}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            max-width: ${euiTheme.breakpoint.s}px;
          `}
        >
          {i18n.PICKER_DESCRIPTION}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="investigationTemplateTaskListsCancel">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canManage ? (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isLoading={saveLinks.isLoading}
                isDisabled={!initialized}
                onClick={() => void handleSave()}
                data-test-subj="investigationTemplateTaskListsSave"
              >
                {i18n.PICKER_SAVE}
              </EuiButton>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
TemplateTaskListsPicker.displayName = 'TemplateTaskListsPicker';
