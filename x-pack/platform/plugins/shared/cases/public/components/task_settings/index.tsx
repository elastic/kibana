/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiPageBody, EuiPageSection, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HeaderPage } from '../header_page';
import { useCasesTaskSettingsBreadcrumbs } from '../use_breadcrumbs';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { usePersistConfiguration } from '../../containers/configure/use_persist_configuration';
import { TaskStatuses } from '../configure_cases/task_statuses';
import { TaskStatusFlyout } from '../configure_cases/task_status_flyout';
import { TaskTemplates } from '../task_templates/task_templates';
import { TaskTemplateFlyout } from '../task_templates/task_template_flyout';
import { mergeTaskStatusesWithDefaults } from '../../../common/types/domain/task/v1';
import type { TaskStatusDefinition } from '../../../common/types/domain/task/v1';
import type { CaseTaskTemplate } from '../../../common/types/domain/task_template/v1';
import { addOrReplaceField } from '../utils';

const PAGE_TITLE = i18n.translate('xpack.cases.taskSettings.pageTitle', {
  defaultMessage: 'Task settings',
});

export const TaskSettingsPage: React.FC = () => {
  useCasesTaskSettingsBreadcrumbs();

  const {
    data: currentConfiguration,
    isLoading: loadingCaseConfigure,
  } = useGetCaseConfiguration();

  const {
    mutate: persistCaseConfigure,
    isLoading: isPersistingConfiguration,
  } = usePersistConfiguration();

  const {
    connector,
    closureType,
    customFields,
    templates,
    id: configurationId,
    version: configurationVersion,
    taskStatuses: configuredTaskStatuses = [],
  } = currentConfiguration;

  const isLoadingCaseConfiguration = loadingCaseConfigure || isPersistingConfiguration;

  const [taskStatusFlyoutOpen, setTaskStatusFlyoutOpen] = useState(false);
  const [taskStatusToEdit, setTaskStatusToEdit] = useState<TaskStatusDefinition | null>(null);
  const [taskTemplateFlyoutOpen, setTaskTemplateFlyoutOpen] = useState(false);
  const [taskTemplateToEdit, setTaskTemplateToEdit] = useState<CaseTaskTemplate | null>(null);

  const onChangeTaskStatuses = useCallback(
    (updatedStatuses: TaskStatusDefinition[]) => {
      persistCaseConfigure({
        connector,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
        closureType,
        taskStatuses: updatedStatuses,
      });
    },
    [
      closureType,
      configurationId,
      configurationVersion,
      connector,
      customFields,
      templates,
      persistCaseConfigure,
    ]
  );

  const onAddTaskStatus = useCallback(() => {
    setTaskStatusToEdit(null);
    setTaskStatusFlyoutOpen(true);
  }, []);

  const onEditTaskStatus = useCallback((status: TaskStatusDefinition) => {
    setTaskStatusToEdit(status);
    setTaskStatusFlyoutOpen(true);
  }, []);

  const onCloseTaskStatusFlyout = useCallback(() => {
    setTaskStatusFlyoutOpen(false);
    setTaskStatusToEdit(null);
  }, []);

  const onSaveTaskStatus = useCallback(
    (status: TaskStatusDefinition) => {
      onChangeTaskStatuses(addOrReplaceField(mergeTaskStatusesWithDefaults(configuredTaskStatuses), status));
      onCloseTaskStatusFlyout();
    },
    [configuredTaskStatuses, onChangeTaskStatuses, onCloseTaskStatusFlyout]
  );

  const onAddTaskTemplate = useCallback(() => {
    setTaskTemplateToEdit(null);
    setTaskTemplateFlyoutOpen(true);
  }, []);

  const onEditTaskTemplate = useCallback((template: CaseTaskTemplate) => {
    setTaskTemplateToEdit(template);
    setTaskTemplateFlyoutOpen(true);
  }, []);

  const onCloseTaskTemplateFlyout = useCallback(() => {
    setTaskTemplateFlyoutOpen(false);
    setTaskTemplateToEdit(null);
  }, []);

  return (
    <EuiPageSection restrictWidth={true}>
      <HeaderPage data-test-subj="cases-task-settings-title" title={PAGE_TITLE} />
      <EuiPageBody restrictWidth={true}>
        <TaskStatuses
          taskStatuses={configuredTaskStatuses}
          isLoading={isLoadingCaseConfiguration}
          disabled={isLoadingCaseConfiguration}
          onAdd={onAddTaskStatus}
          onEdit={onEditTaskStatus}
          onChange={onChangeTaskStatuses}
        />

        <EuiSpacer size="xl" />

        <TaskTemplates
          disabled={isLoadingCaseConfiguration}
          isLoading={isLoadingCaseConfiguration}
          onAddTemplate={onAddTaskTemplate}
          onEditTemplate={onEditTaskTemplate}
        />

        {taskStatusFlyoutOpen && (
          <TaskStatusFlyout
            statusToEdit={taskStatusToEdit}
            onSave={onSaveTaskStatus}
            onClose={onCloseTaskStatusFlyout}
          />
        )}

        {taskTemplateFlyoutOpen && (
          <TaskTemplateFlyout
            templateToEdit={taskTemplateToEdit}
            onClose={onCloseTaskTemplateFlyout}
          />
        )}
      </EuiPageBody>
    </EuiPageSection>
  );
};

TaskSettingsPage.displayName = 'TaskSettingsPage';

// eslint-disable-next-line import/no-default-export
export default TaskSettingsPage;
