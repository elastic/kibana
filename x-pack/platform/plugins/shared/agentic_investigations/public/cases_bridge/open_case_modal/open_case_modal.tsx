/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiComboBox,
  EuiFieldSearch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHealth,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
  type EuiComboBoxOptionOption,
  type EuiSelectableOption,
} from '@elastic/eui';
import { useMutation, useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { EscalationModalRenderProps } from '@kbn/agentic-investigations-common';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { CaseVisibility } from '../../../common/cases_bridge';
import { AI_INVESTIGATION_TEMPLATE_ID, ALERTZERO_CASE_OWNER } from '../../../common/cases_bridge';
import { useCurrentUserProfile, useSuggestUserProfiles } from '../../user_profiles';
import { fetchInvestigation } from '../../investigations/hooks/use_investigation';
import { formatCaseNumber, getCaseHref, linkCase, listOpenInvestigations, openCase } from '../api';
import { ADD_TO_CASE, OPEN_CASE, RELATED } from '../translations';

type Services = CoreStart & { cases?: CasesPublicStart };

interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  /** The connector the template opens cases with, when it has one. */
  connectorId?: string;
}

const NO_TEMPLATE = '__none__';

const useCaseTemplates = () => {
  const { services } = useKibana<Services>();
  return useQuery({
    queryKey: ['agenticInvestigations', 'casesBridge', 'templates'],
    queryFn: async ({ signal }) => {
      // Adds the shipped AI investigation template to this space if it isn't there yet (a space
      // created after Kibana started). Best effort: without it the modal still lists the rest.
      await services.http
        .post('/internal/cases/system_templates/_ensure', {
          body: JSON.stringify({ owner: ALERTZERO_CASE_OWNER }),
          signal,
        })
        .catch(() => undefined);
      const response = await services.http.get<{
        templates: Array<{
          templateId?: string;
          id?: string;
          name?: string;
          description?: string;
          definition?: { connector?: { id?: string; type?: string } };
        }>;
      }>('/api/cases/templates', {
        query: { owner: ALERTZERO_CASE_OWNER, isEnabled: true, perPage: 100 },
        signal,
      });
      return response.templates.flatMap((template): TemplateSummary[] => {
        const id = template.templateId ?? template.id;
        const connector = template.definition?.connector;
        return id && template.name
          ? [
              {
                id,
                name: template.name,
                description: template.description,
                ...(connector?.id && connector.type !== '.none'
                  ? { connectorId: connector.id }
                  : {}),
              },
            ]
          : [];
      });
    },
    // A space without templates, or without the templates feature, still opens a case.
    retry: false,
  });
};

// The name shown in the Push switch. Users who can't read connectors still see the switch.
const useConnectorName = (connectorId: string | undefined) => {
  const { services } = useKibana<Services>();
  return useQuery({
    queryKey: ['agenticInvestigations', 'casesBridge', 'connector', connectorId],
    enabled: connectorId != null,
    queryFn: async ({ signal }) => {
      const connector = await services.http.get<{ name?: string }>(
        `/api/actions/connector/${encodeURIComponent(connectorId ?? '')}`,
        { signal }
      );
      return connector.name ?? null;
    },
    retry: false,
  });
};

const useNavigateToCase = () => {
  const { services } = useKibana<Services>();
  return (caseId: string) =>
    void services.application.navigateToUrl(getCaseHref(services.application, caseId));
};

/**
 * Open a case from an investigation (create mode), or link it to an open case (add-to-existing
 * mode). Replaces the escalation modal when the cases bridge is on.
 */
export const OpenCaseModal: React.FC<EscalationModalRenderProps> = ({
  mode: initialMode,
  investigation,
  onClose,
}) => {
  const [mode, setMode] = useState(initialMode);
  if (!investigation.conversationId) {
    return null;
  }
  return mode === 'create' ? (
    <CreateCaseMode
      investigationId={investigation.conversationId}
      investigationTitle={investigation.title}
      onClose={onClose}
      onSwitchMode={() => setMode('addToExisting')}
    />
  ) : (
    <AddToExistingMode
      investigationId={investigation.conversationId}
      investigationTitle={investigation.title}
      onClose={onClose}
      onSwitchMode={() => setMode('create')}
    />
  );
};
OpenCaseModal.displayName = 'OpenCaseModal';

const CreateCaseMode: React.FC<{
  investigationId: string;
  investigationTitle: string;
  onClose: () => void;
  onSwitchMode: () => void;
}> = ({ investigationId, investigationTitle, onClose, onSwitchMode }) => {
  const { services } = useKibana<Services>();
  const navigateToCase = useNavigateToCase();
  const [title, setTitle] = useState(investigationTitle);
  const [isTitleEdited, setIsTitleEdited] = useState(false);
  // Queue cards are proposals, so the title they pass is the proposal's. Prefill the case name with
  // the investigation's own title once it loads, unless the analyst already typed one.
  const sourceInvestigation = useQuery({
    queryKey: ['agenticInvestigations', 'casesBridge', 'source', investigationId],
    queryFn: ({ signal }) => fetchInvestigation(services.http, investigationId, signal),
  });
  useEffect(() => {
    if (!isTitleEdited && sourceInvestigation.data?.title) {
      setTitle(sourceInvestigation.data.title);
    }
  }, [isTitleEdited, sourceInvestigation.data?.title]);
  const sourceTitle = sourceInvestigation.data?.title || investigationTitle;
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const [isTemplateChosen, setIsTemplateChosen] = useState(false);
  const [visibility, setVisibility] = useState<CaseVisibility>('restricted');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assignees, setAssignees] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [push, setPush] = useState(true);

  const { data: currentUser } = useCurrentUserProfile();
  const { data: suggestions = [], isFetching: isSearchingAssignees } =
    useSuggestUserProfiles(assigneeSearch);
  const templates = useCaseTemplates();
  // The shipped AI investigation template is the default when it is on in this space.
  useEffect(() => {
    if (
      !isTemplateChosen &&
      templates.data?.some(({ id }) => id === AI_INVESTIGATION_TEMPLATE_ID)
    ) {
      setTemplateId(AI_INVESTIGATION_TEMPLATE_ID);
    }
  }, [isTemplateChosen, templates.data]);
  const investigations = useQuery({
    queryKey: ['agenticInvestigations', 'casesBridge', 'openInvestigations'],
    queryFn: ({ signal }) => listOpenInvestigations(services.http, { signal }),
  });

  const selectedTemplate = templates.data?.find(({ id }) => id === templateId);
  const pushConnectorId = selectedTemplate?.connectorId;
  const connectorName = useConnectorName(pushConnectorId);
  const connectorLabel = connectorName.data ?? OPEN_CASE.templateConnectorFallback;
  const pushRequested = pushConnectorId != null && push;

  const submit = useMutation({
    mutationFn: () =>
      openCase(services.http, investigationId, {
        title: title.trim(),
        visibility,
        assignees: assignees.flatMap(({ value }) => (value ? [value] : [])),
        linked_investigation_ids: linkIds,
        push: pushConnectorId != null && push,
        ...(templateId !== NO_TEMPLATE ? { template_id: templateId } : {}),
      }),
    onSuccess: (result) => {
      const failed = result.linked.filter(({ error }) => error != null).length;
      const caseNumber = formatCaseNumber({
        incremental_id: result.incremental_id,
        title: result.case_title,
      });
      const toast = {
        title: OPEN_CASE.successToastTitle(caseNumber),
        text: toMountPoint(
          <EuiText size="s">
            {failed > 0
              ? OPEN_CASE.partialToastText(failed)
              : result.pushed && result.connector_name
              ? OPEN_CASE.pushedToastText(result.linked.length, result.connector_name)
              : OPEN_CASE.successToastText(result.linked.length)}
            {pushRequested && !result.pushed
              ? ` ${OPEN_CASE.pushFailedToastText(result.connector_name ?? connectorLabel)}`
              : null}
          </EuiText>,
          services
        ),
      };
      if (failed > 0 || (pushRequested && !result.pushed)) {
        services.notifications.toasts.addWarning(toast);
      } else {
        services.notifications.toasts.addSuccess(toast);
      }
      onClose();
      navigateToCase(result.case_id);
    },
    onError: () => {
      services.notifications.toasts.addDanger({
        title: OPEN_CASE.errorToastTitle,
        text: OPEN_CASE.errorToastText,
      });
    },
  });

  const creatorUid = currentUser?.uid;
  const isRestricted = visibility === 'restricted';

  const assigneeOptions: Array<EuiComboBoxOptionOption<string>> = suggestions
    .filter(({ uid }) => uid !== creatorUid)
    .map((profile) => ({
      label: profile.user.full_name || profile.user.username,
      value: profile.uid,
      key: profile.uid,
    }));
  const creatorOption: EuiComboBoxOptionOption<string> | undefined = currentUser
    ? {
        label: currentUser.user.full_name || currentUser.user.username,
        value: currentUser.uid,
        key: currentUser.uid,
        // The creator stays assigned while restricted, so they keep access.
        ...(isRestricted ? { disabled: true } : {}),
      }
    : undefined;
  const selectedAssignees = [...(creatorOption ? [creatorOption] : []), ...assignees];

  const investigationOptions: EuiSelectableOption[] = useMemo(() => {
    const others = (investigations.data?.results ?? []).filter(
      ({ id, metadata }) => id !== investigationId && metadata.case_id == null
    );
    return [
      {
        key: investigationId,
        label: sourceTitle || RELATED.untitled,
        data: { subtitle: OPEN_CASE.thisInvestigation },
        checked: 'on' as const,
        disabled: true,
        append: <EuiBadge color="hollow">{OPEN_CASE.thisInvestigation}</EuiBadge>,
      },
      ...others.map((other) => ({
        key: other.id,
        label: other.title || RELATED.untitled,
        data: {
          subtitle: [other.metadata.severity, other.metadata.summary].filter(Boolean).join(' · '),
        },
        checked: linkIds.includes(other.id) ? ('on' as const) : undefined,
        'data-test-subj': `openCaseLinkOption-${other.id}`,
      })),
    ];
  }, [investigations.data, investigationId, sourceTitle, linkIds]);

  const isNameMissing = title.trim().length === 0;

  return (
    <EuiModal onClose={onClose} style={{ width: 720 }} data-test-subj="openCaseModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{OPEN_CASE.modalTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm component="form" id="openCaseForm" onSubmit={(event) => event.preventDefault()}>
          <EuiFormRow label={OPEN_CASE.nameLabel} fullWidth isInvalid={isNameMissing}>
            <EuiFieldText
              fullWidth
              value={title}
              onChange={(event) => {
                setIsTitleEdited(true);
                setTitle(event.target.value);
              }}
              isInvalid={isNameMissing}
              data-test-subj="openCaseName"
            />
          </EuiFormRow>
          <EuiFormRow label={OPEN_CASE.templateLabel} fullWidth>
            <EuiSuperSelect
              fullWidth
              isLoading={templates.isLoading}
              valueOfSelected={templateId}
              onChange={(value) => {
                setIsTemplateChosen(true);
                setTemplateId(value);
                // Each template's connector starts with push on, as the spec says.
                setPush(true);
              }}
              data-test-subj="openCaseTemplate"
              options={[
                { value: NO_TEMPLATE, inputDisplay: OPEN_CASE.templateNone },
                ...(templates.data ?? []).map((template) => ({
                  value: template.id,
                  inputDisplay: template.name,
                  dropdownDisplay: (
                    <>
                      <strong>{template.name}</strong>
                      {template.description ? (
                        <EuiText size="xs" color="subdued">
                          {template.description}
                        </EuiText>
                      ) : null}
                    </>
                  ),
                })),
              ]}
            />
          </EuiFormRow>
          {selectedTemplate?.description ? (
            <EuiPanel color="subdued" paddingSize="s" hasShadow={false}>
              <EuiText size="xs">{selectedTemplate.description}</EuiText>
            </EuiPanel>
          ) : null}
          {pushConnectorId != null ? (
            <EuiFormRow fullWidth helpText={OPEN_CASE.pushHelp(connectorLabel)}>
              <EuiSwitch
                label={OPEN_CASE.pushLabel(connectorLabel)}
                checked={push}
                onChange={(event) => setPush(event.target.checked)}
                data-test-subj="open-case-push-switch"
              />
            </EuiFormRow>
          ) : null}
          <EuiFormRow
            label={OPEN_CASE.visibilityLabel}
            fullWidth
            helpText={isRestricted ? OPEN_CASE.restrictedHelp : OPEN_CASE.publicHelp}
          >
            <EuiButtonGroup
              legend={OPEN_CASE.visibilityLabel}
              idSelected={visibility}
              onChange={(id) => setVisibility(id as CaseVisibility)}
              options={[
                {
                  id: 'public',
                  label: OPEN_CASE.visibilityPublic,
                  'data-test-subj': 'openCaseVisibilityPublic',
                },
                {
                  id: 'restricted',
                  label: OPEN_CASE.visibilityRestricted,
                  iconType: 'lock',
                  'data-test-subj': 'openCaseVisibilityRestricted',
                },
              ]}
            />
          </EuiFormRow>
          <EuiFormRow
            label={OPEN_CASE.assigneesLabel}
            fullWidth
            helpText={isRestricted ? OPEN_CASE.assigneesRestrictedHelp : undefined}
          >
            <EuiComboBox<string>
              fullWidth
              async
              isLoading={isSearchingAssignees}
              options={assigneeOptions}
              selectedOptions={selectedAssignees}
              onSearchChange={setAssigneeSearch}
              onChange={(next) => setAssignees(next.filter(({ value }) => value !== creatorUid))}
              isClearable={!isRestricted}
              data-test-subj="openCaseAssignees"
            />
          </EuiFormRow>
          <EuiFormRow label={OPEN_CASE.linkLabel} fullWidth helpText={OPEN_CASE.linkHelp}>
            {investigations.isError ? (
              <EuiCallOut
                announceOnMount
                color="danger"
                size="s"
                iconType="error"
                title={OPEN_CASE.investigationsError}
              >
                <EuiButton size="s" color="danger" onClick={() => investigations.refetch()}>
                  {OPEN_CASE.tryAgain}
                </EuiButton>
              </EuiCallOut>
            ) : (
              <EuiSelectable
                searchable
                searchProps={{ placeholder: OPEN_CASE.linkSearchPlaceholder }}
                isLoading={investigations.isLoading}
                options={investigationOptions}
                listProps={{ rowHeight: 48, showIcons: true }}
                renderOption={(option) => (
                  <>
                    <EuiText size="s" className="eui-textTruncate">
                      {option.label}
                    </EuiText>
                    <EuiText size="xs" color="subdued" className="eui-textTruncate">
                      {(option as { subtitle?: string }).subtitle ?? option.data?.subtitle}
                    </EuiText>
                  </>
                )}
                onChange={(next) =>
                  setLinkIds(
                    next.flatMap(({ checked, key }) =>
                      checked === 'on' && key && key !== investigationId ? [key] : []
                    )
                  )
                }
                height={192}
                data-test-subj="openCaseLinkInvestigations"
              >
                {(list, search) => (
                  <>
                    {search}
                    <EuiSpacer size="xs" />
                    {list}
                  </>
                )}
              </EuiSelectable>
            )}
          </EuiFormRow>
          <EuiText size="xs" color="subdued">
            {OPEN_CASE.selectedCount(linkIds.length + 1)}
          </EuiText>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onSwitchMode} data-test-subj="openCaseAddToExisting">
              {OPEN_CASE.addToExistingInstead}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose} data-test-subj="openCaseCancel">
                  {OPEN_CASE.cancel}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={isNameMissing ? OPEN_CASE.missingName : undefined}>
                  <EuiButton
                    fill
                    isDisabled={isNameMissing}
                    isLoading={submit.isLoading}
                    onClick={() => submit.mutate()}
                    data-test-subj="openCaseSubmit"
                  >
                    {OPEN_CASE.submit}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};

interface OpenCaseRow {
  id: string;
  title: string;
  incrementalId?: number | null;
  status: string;
  severity: string;
  isRestricted: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'subdued',
  medium: 'warning',
  high: 'risk',
  critical: 'danger',
};

const AddToExistingMode: React.FC<{
  investigationId: string;
  investigationTitle: string;
  onClose: () => void;
  onSwitchMode: () => void;
}> = ({ investigationId, investigationTitle, onClose, onSwitchMode }) => {
  const { services } = useKibana<Services>();
  const navigateToCase = useNavigateToCase();
  const [search, setSearch] = useState('');
  const cases = useQuery({
    queryKey: ['agenticInvestigations', 'casesBridge', 'openCases', search],
    queryFn: async ({ signal }): Promise<OpenCaseRow[]> => {
      if (!services.cases) {
        return [];
      }
      // Find only returns cases the user can see, so restricted cases they aren't on never list.
      const result = await services.cases.api.cases.find(
        {
          owner: ALERTZERO_CASE_OWNER,
          status: ['open', 'in-progress'],
          perPage: 20,
          sortField: 'updatedAt',
          sortOrder: 'desc',
          ...(search ? { search } : {}),
        } as Parameters<CasesPublicStart['api']['cases']['find']>[0],
        signal
      );
      return result.cases.map((theCase) => ({
        id: theCase.id,
        title: theCase.title,
        incrementalId: theCase.incrementalId,
        status: theCase.status,
        severity: theCase.severity,
        isRestricted: theCase.access?.mode === 'restricted',
      }));
    },
  });

  const link = useMutation({
    mutationFn: (caseId: string) => linkCase(services.http, investigationId, caseId),
    onSuccess: (result) => {
      const caseNumber = formatCaseNumber({
        incremental_id: result.incremental_id,
        title: result.case_title,
      });
      services.notifications.toasts.addSuccess({
        title: ADD_TO_CASE.successToastTitle(caseNumber),
        text: ADD_TO_CASE.successToastText(investigationTitle),
      });
      onClose();
      navigateToCase(result.case_id);
    },
    onError: () => {
      services.notifications.toasts.addDanger({ title: ADD_TO_CASE.errorToastTitle });
    },
  });

  const columns: Array<EuiBasicTableColumn<OpenCaseRow>> = [
    {
      name: ADD_TO_CASE.columnCase,
      width: '50%',
      render: (row: OpenCaseRow) => (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          {row.isRestricted ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type="lock" aria-label={ADD_TO_CASE.restricted} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem className="eui-textTruncate">
            <EuiText size="s" className="eui-textTruncate">
              {row.title}
            </EuiText>
            {row.incrementalId != null ? (
              <EuiText size="xs" color="subdued">{`#${row.incrementalId}`}</EuiText>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      name: ADD_TO_CASE.columnStatus,
      render: (row: OpenCaseRow) => <EuiBadge color="hollow">{row.status}</EuiBadge>,
    },
    {
      name: ADD_TO_CASE.columnSeverity,
      render: (row: OpenCaseRow) => (
        <EuiHealth color={SEVERITY_COLORS[row.severity] ?? 'subdued'}>{row.severity}</EuiHealth>
      ),
    },
    {
      align: 'right',
      render: (row: OpenCaseRow) => (
        <EuiButton
          size="s"
          onClick={() => link.mutate(row.id)}
          isLoading={link.isLoading && link.variables === row.id}
          data-test-subj={`addToCaseSelect-${row.id}`}
        >
          {ADD_TO_CASE.select}
        </EuiButton>
      ),
    },
  ];

  return (
    <EuiModal onClose={onClose} style={{ width: 960 }} data-test-subj="addToExistingCaseModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{ADD_TO_CASE.title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiPanel color="subdued" paddingSize="s" hasShadow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="productAgent" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{ADD_TO_CASE.suggestedTitle}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{ADD_TO_CASE.suggestedBadge}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {ADD_TO_CASE.suggestedBody}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              placeholder={ADD_TO_CASE.searchPlaceholder}
              onSearch={setSearch}
              incremental
              data-test-subj="addToCaseSearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSwitchMode} iconType="plusCircle">
              {ADD_TO_CASE.openNewCase}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {ADD_TO_CASE.scopeNote}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<OpenCaseRow>
          tableCaption={ADD_TO_CASE.title}
          items={cases.data ?? []}
          loading={cases.isLoading}
          columns={columns}
          noItemsMessage={ADD_TO_CASE.noMatches}
          tableLayout="fixed"
          data-test-subj="addToCaseTable"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="addToCaseCancel">
          {OPEN_CASE.cancel}
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};
