/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useSubAction,
  useKibana,
  ActionParamsProps,
  JsonEditorWithMessageVariables,
  TextFieldWithMessageVariables,
  ActionConnectorMode,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiFormRow,
  EuiComboBoxOptionOption,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiSwitch,
  EuiSelect,
} from '@elastic/eui';
import { SUB_ACTION, XSOARSeverity } from '../../../common/xsoar/constants';
import {
  ExecutorParams,
  XSOARRunActionParams,
  XSOARPlaybooksActionResponse,
  XSOARPlaybooksActionParams,
  XSOARPlaybooksObject,
} from '../../../common/xsoar/types';
import * as translations from './translations';
import { severityOptions } from './constants';

type PlaybookOption = EuiComboBoxOptionOption<XSOARPlaybooksObject>;

const createOption = (playbook: XSOARPlaybooksObject): PlaybookOption => ({
  key: playbook.id,
  label: playbook.name,
});

const renderPlaybook = (
  { label }: PlaybookOption,
  searchValue: string,
  contentClassName: string
) => (
  <EuiFlexGroup className={contentClassName} direction="row" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiHighlight search={searchValue}>{label}</EuiHighlight>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const XSOARParamsFields: React.FunctionComponent<ActionParamsProps<ExecutorParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  executionMode,
}) => {
  const { toasts } = useKibana().notifications;
  const isTest = executionMode === ActionConnectorMode.Test;
  const incident = useMemo(
    () =>
      (actionParams.subActionParams as XSOARRunActionParams) ??
      ({
        severity: XSOARSeverity.UNKNOWN,
        createInvestigation: false,
      } as unknown as XSOARRunActionParams),

    [actionParams.subActionParams]
  );

  const [connectorId, setConnectorId] = useState<string | undefined>(actionConnector?.id);
  const [selectedPlaybookOption, setSelectedPlaybookOption] = useState<
    PlaybookOption | null | undefined
  >();
  const [isRuleSeverity, setIsRuleSeverity] = useState<boolean>(Boolean(incident.isRuleSeverity));
  const [playbooks, setPlaybooks] = useState<XSOARPlaybooksObject[]>();

  useEffect(() => {
    if (actionConnector != null && connectorId !== actionConnector.id) {
      setConnectorId(actionConnector?.id);
      setSelectedPlaybookOption(null);
      setIsRuleSeverity(isTest ? false : true);
      editAction(
        'subActionParams',
        {
          severity: XSOARSeverity.UNKNOWN,
          createInvestigation: false,
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', SUB_ACTION.RUN, index);
    }
    if (!actionParams.subActionParams) {
      editAction('subActionParams', incident, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  const {
    response: { playbooks: fetchedPlaybooks } = {},
    isLoading: isLoadingPlaybooks,
    error: playbooksError,
  } = useSubAction<XSOARPlaybooksActionParams, XSOARPlaybooksActionResponse>({
    connectorId,
    subAction: 'getPlaybooks',
  });

  useEffect(() => {
    if (playbooksError) {
      toasts.danger({ title: translations.PLAYBOOKS_ERROR, body: playbooksError.message });
      setPlaybooks([]);
    } else {
      setPlaybooks(fetchedPlaybooks);
    }
  }, [toasts, playbooksError, fetchedPlaybooks]);

  const playbooksOptions = useMemo(() => playbooks?.map(createOption) ?? [], [playbooks]);

  useEffect(() => {
    if (selectedPlaybookOption === undefined && incident.playbookId && playbooks !== undefined) {
      const selectedPlaybook = playbooks.find(({ id }) => id === incident.playbookId);
      if (selectedPlaybook) {
        setSelectedPlaybookOption(createOption(selectedPlaybook));
      } else {
        toasts.warning({ title: translations.PLAYBOOK_NOT_FOUND_WARNING });
        editAction(
          'subActionParams',
          { ...incident, playbookId: undefined, createInvestigation: false },
          index
        );
      }
    }

    if (
      selectedPlaybookOption !== undefined &&
      selectedPlaybookOption?.key !== incident.playbookId
    ) {
      editAction(
        'subActionParams',
        {
          ...incident,
          playbookId: selectedPlaybookOption?.key,
          createInvestigation:
            selectedPlaybookOption === null ? false : incident.createInvestigation,
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaybookOption, incident.playbookId, playbooks, toasts, editAction, index]);

  const selectedPlaybookOptions = useMemo(
    () => (selectedPlaybookOption ? [selectedPlaybookOption] : []),
    [selectedPlaybookOption]
  );

  const onChangePlaybook = useCallback(([selected]: PlaybookOption[]) => {
    setSelectedPlaybookOption(selected ?? null);
  }, []);

  return (
    <>
      <TextFieldWithMessageVariables
        index={index}
        editAction={(key, value) => {
          editAction('subActionParams', { ...incident, [key]: value }, index);
        }}
        messageVariables={messageVariables}
        paramsProperty={'name'}
        inputTargetValue={incident.name}
        wrapField={true}
        formRowProps={{
          label: translations.NAME_LABEL,
          fullWidth: true,
          helpText: '',
          isInvalid:
            errors.name !== undefined &&
            Number(errors.name.length) > 0 &&
            incident.name !== undefined,
          error: errors.name as string,
        }}
        errors={errors.name as string[]}
      />
      <EuiFormRow
        fullWidth
        error={errors.playbook as string[]}
        isInvalid={!!errors.playbook?.length && selectedPlaybookOption !== undefined}
        label={translations.PLAYBOOK_LABEL}
        helpText={translations.PLAYBOOK_HELP}
      >
        <EuiComboBox
          aria-label={translations.PLAYBOOK_ARIA_LABEL}
          placeholder={translations.PLAYBOOK_PLACEHOLDER}
          singleSelection={{ asPlainText: true }}
          options={playbooksOptions}
          selectedOptions={selectedPlaybookOptions}
          onChange={onChangePlaybook}
          isDisabled={isLoadingPlaybooks}
          isLoading={isLoadingPlaybooks}
          renderOption={renderPlaybook}
          fullWidth
          data-test-subj="xsoar-playbookSelector"
        />
      </EuiFormRow>
      {selectedPlaybookOption && (
        <EuiFormRow fullWidth>
          <EuiSwitch
            label={translations.START_INVESTIGATION_LABEL}
            checked={incident.createInvestigation}
            data-test-subj="createInvestigation-toggle"
            onChange={(e) => {
              editAction(
                'subActionParams',
                {
                  ...incident,
                  createInvestigation: e.target.checked,
                },
                index
              );
            }}
          />
        </EuiFormRow>
      )}
      {!isTest && (
        <EuiFormRow fullWidth>
          <EuiSwitch
            label={translations.IS_RULE_SEVERITY_LABEL}
            checked={Boolean(isRuleSeverity)}
            data-test-subj="rule-severity-toggle"
            onChange={(e) => {
              setIsRuleSeverity(e.target.checked);
              editAction(
                'subActionParams',
                {
                  ...incident,
                  isRuleSeverity: e.target.checked,
                },
                index
              );
            }}
          />
        </EuiFormRow>
      )}
      {!Boolean(isRuleSeverity) && (
        <EuiFormRow fullWidth label={translations.SEVERITY_LABEL}>
          <EuiSelect
            fullWidth
            data-test-subj="severitySelectInput"
            disabled={Boolean(isRuleSeverity)}
            value={incident.severity ?? severityOptions[0].value}
            options={severityOptions}
            onChange={(e) => {
              editAction(
                'subActionParams',
                { ...incident, severity: parseFloat(e.target.value) },
                index
              );
            }}
          />
        </EuiFormRow>
      )}
      <JsonEditorWithMessageVariables
        key={connectorId}
        messageVariables={messageVariables}
        paramsProperty={'body'}
        inputTargetValue={incident.body}
        label={translations.BODY_LABEL}
        ariaLabel={translations.BODY_DESCRIPTION}
        onDocumentsChange={(json: string) =>
          editAction('subActionParams', { ...incident, body: json }, index)
        }
        dataTestSubj="xsoar-body"
        onBlur={() => {
          if (!incident.body) {
            editAction('subActionParams', { ...incident, body: null }, index);
          }
        }}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { XSOARParamsFields as default };
