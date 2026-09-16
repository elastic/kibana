/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useFetchWorkflows } from '../../../../hooks/use_fetch_workflows';
import type { ActionPolicyFormState } from '../types';

interface SelectedWorkflow {
  id: string;
  name: string;
}

const WORKFLOW_OPTION_ROW_HEIGHT = 64;

const getPrototypeIcons = (
  workflow: WorkflowListItemDto
): { triggers: string[]; steps: string[] } => {
  const triggersFromDefinition =
    workflow.definition?.triggers
      ?.map((trigger) => {
        if (trigger.type === 'manual') return 'play';
        if (trigger.type === 'scheduled') return 'clock';
        return 'bolt';
      })
      .filter(Boolean) ?? [];

  const stepsFromDefinition =
    workflow.definition?.steps
      ?.map((step) => {
        const type = 'type' in step ? String(step.type) : '';
        if (type.includes('email')) return 'email';
        if (type.includes('slack')) return 'logoSlack';
        if (type.includes('webhook') || type.includes('http')) return 'link';
        return 'gear';
      })
      .filter(Boolean) ?? [];

  if (triggersFromDefinition.length > 0 || stepsFromDefinition.length > 0) {
    return {
      triggers: triggersFromDefinition.slice(0, 3),
      steps: stepsFromDefinition.slice(0, 4),
    };
  }

  // Prototype fallback when list payloads omit definition details.
  const name = workflow.name.toLowerCase();
  return {
    triggers: ['bolt'],
    steps: name.includes('slack')
      ? ['logoSlack']
      : name.includes('email')
      ? ['email']
      : name.includes('pager')
      ? ['bell']
      : ['gear', 'logoSlack'],
  };
};

const WorkflowOptionContent = ({ workflow }: { workflow: WorkflowListItemDto }) => {
  const { triggers, steps } = getPrototypeIcons(workflow);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{workflow.name}</strong>
        </EuiText>
      </EuiFlexItem>
      {workflow.description ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {workflow.description}
          </EuiText>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          {triggers.map((icon, index) => (
            <EuiFlexItem grow={false} key={`trigger-${icon}-${index}`}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.destination.workflowTriggerIcon',
                  { defaultMessage: 'Trigger' }
                )}
              >
                <EuiIcon type={icon} size="m" color="subdued" />
              </EuiToolTip>
            </EuiFlexItem>
          ))}
          {triggers.length > 0 && steps.length > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                |
              </EuiText>
            </EuiFlexItem>
          ) : null}
          {steps.map((icon, index) => (
            <EuiFlexItem grow={false} key={`step-${icon}-${index}`}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.alertingV2.actionPolicy.form.destination.workflowStepIcon',
                  { defaultMessage: 'Step' }
                )}
              >
                <EuiIcon type={icon} size="m" color="subdued" />
              </EuiToolTip>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const WorkflowSelector = () => {
  const { control } = useFormContext<ActionPolicyFormState>();
  const destinations = useWatch({ control, name: 'destinations' });
  const inlineActions = useWatch({ control, name: 'inlineActions' });
  const application = useService(CoreStart('application'));
  const uiSettings = useService(CoreStart('uiSettings'));
  const isWorkflowsEnabled = uiSettings.get<boolean>(WORKFLOWS_UI_SETTING_ID);

  const [selectedWorkflows, setSelectedWorkflows] = useState<SelectedWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  const { data: workflowsData, isLoading } = useFetchWorkflows({
    query: debouncedQuery,
    isEnabled: isWorkflowsEnabled,
  });

  useEffect(() => {
    if (selectedWorkflows.length > 0 || destinations.length === 0 || !workflowsData) {
      return;
    }

    const workflowsById = new Map(workflowsData.results.map((w) => [w.id, w.name]));
    setSelectedWorkflows(
      destinations.map((d) => ({ id: d.id, name: workflowsById.get(d.id) ?? d.id }))
    );
  }, [destinations, workflowsData, selectedWorkflows.length]);

  const workflowComboOptions = useMemo((): Array<EuiComboBoxOptionOption<string>> => {
    return (workflowsData?.results ?? []).map((workflow) => ({
      label: workflow.name,
      value: workflow.id,
      'data-test-subj': `workflowOption-${workflow.id}`,
      dropdownDisplay: <WorkflowOptionContent workflow={workflow} />,
    }));
  }, [workflowsData?.results]);

  if (!isWorkflowsEnabled) {
    const settingsUrl = application.getUrlForApp('management', {
      path: `/kibana/settings?query=${encodeURIComponent(WORKFLOWS_UI_SETTING_ID)}`,
    });

    return (
      <EuiCallOut
        announceOnMount={false}
        title={i18n.translate(
          'xpack.alertingV2.actionPolicy.form.destination.workflowsDisabled.title',
          { defaultMessage: 'Workflows are not enabled' }
        )}
        color="warning"
        iconType="warning"
        data-test-subj="workflowsDisabledCallout"
      >
        <FormattedMessage
          id="xpack.alertingV2.actionPolicy.form.destination.workflowsDisabled.description"
          defaultMessage="Action policies use Workflows for destinations, you'll need to enable them first. Enable the {settingName} setting in {advancedSettingsLink}, then refresh this page."
          values={{
            settingName: WORKFLOWS_UI_SETTING_ID,
            advancedSettingsLink: (
              <EuiLink href={settingsUrl} data-test-subj="workflowsDisabledSettingsLink">
                <FormattedMessage
                  id="xpack.alertingV2.actionPolicy.form.destination.workflowsDisabled.advancedSettingsLink"
                  defaultMessage="Advanced Settings"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
    );
  }

  return (
    <Controller
      name="destinations"
      control={control}
      rules={{
        validate: (value) =>
          value.length > 0 || inlineActions.length > 0
            ? true
            : i18n.translate('xpack.alertingV2.actionPolicy.form.destination.required', {
                defaultMessage: 'At least one destination is required',
              }),
      }}
      render={({ field, fieldState: { error } }) => (
        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.actionPolicy.form.destination.workflows', {
            defaultMessage: 'Workflows',
          })}
          fullWidth
          isInvalid={!!error}
          error={error?.message}
        >
          <EuiComboBox
            fullWidth
            async
            isLoading={isLoading}
            isInvalid={!!error}
            data-test-subj="destinationsInput"
            placeholder={i18n.translate(
              'xpack.alertingV2.actionPolicy.form.destination.placeholder',
              { defaultMessage: 'Search and select workflows' }
            )}
            selectedOptions={selectedWorkflows.map((w) => ({ label: w.name, value: w.id }))}
            onSearchChange={setSearchQuery}
            onChange={(options) => {
              setSelectedWorkflows(options.map((o) => ({ id: o.value as string, name: o.label })));
              field.onChange(
                options.map((o) => ({ type: 'workflow' as const, id: o.value as string }))
              );
            }}
            options={workflowComboOptions}
            rowHeight={WORKFLOW_OPTION_ROW_HEIGHT}
          />
        </EuiFormRow>
      )}
    />
  );
};
