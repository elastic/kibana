/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonProps, EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiLink,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiPopover,
  EuiSpacer,
  EuiTabbedContent,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { filterToolsBySelection, type AgentDefinition } from '@kbn/agent-builder-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { defer } from 'lodash';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { pushFlyoutPaddingStyles } from '../../../../common.styles';
import { useAgentEdit } from '../../../hooks/agents/use_agent_edit';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { searchParamNames } from '../../../search_param_names';
import { appPaths } from '../../../utils/app_paths';
import { isValidAgentAvatarColor } from '../../../utils/color';
import { labels } from '../../../utils/i18n';
import { zodResolver } from '../../../utils/zod_resolver';
import { AgentAvatar } from '../../common/agent_avatar';
import { agentFormSchema } from './agent_form_validation';
import { AgentSettingsTab } from './tabs/settings_tab';
import { ToolsTab } from './tabs/tools_tab';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

const BUTTON_IDS = {
  SAVE: 'save',
  SAVE_AND_CHAT: 'saveAndChat',
} as const;

// We can't use useDeleteAgent here because DeleteAgentContext is not available for create mode
// so pass onDelete as prop for edit mode.
interface EditingAgentFormProps {
  editingAgentId: string;
  onDelete: () => void;
}

interface CreateAgentFormProps {
  editingAgentId?: never;
  onDelete?: never;
}

type AgentFormProps = EditingAgentFormProps | CreateAgentFormProps;

export type AgentFormData = Omit<AgentDefinition, 'type' | 'readonly'>;

export const AgentForm: React.FC<AgentFormProps> = ({ editingAgentId, onDelete }) => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { manageAgents } = useUiPrivileges();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { docLinksService } = useAgentBuilderServices();
  // Resolve state updates before navigation to avoid triggering unsaved changes prompt
  const deferNavigateToAgentBuilderUrl = useCallback(
    (...args: Parameters<typeof navigateToAgentBuilderUrl>) => {
      defer(() => navigateToAgentBuilderUrl(...args));
    },
    [navigateToAgentBuilderUrl]
  );
  const { services } = useKibana();
  const {
    notifications,
    http,
    overlays: { openConfirm },
    application: { navigateToUrl },
    appParams: { history },
  } = services;
  const agentFormId = useGeneratedHtmlId({
    prefix: 'agentForm',
  });

  const isCreateMode = !editingAgentId;

  const onSaveSuccess = () => {
    notifications.toasts.addSuccess(
      isCreateMode
        ? i18n.translate('xpack.agentBuilder.agents.createSuccessMessage', {
            defaultMessage: 'Agent created successfully',
          })
        : i18n.translate('xpack.agentBuilder.agents.updateSuccessMessage', {
            defaultMessage: 'Agent updated successfully',
          })
    );
  };

  const onSaveError = (err: Error) => {
    const errorMessageTitle = isCreateMode
      ? i18n.translate('xpack.agentBuilder.agents.createErrorMessage', {
          defaultMessage: 'Failed to create agent',
        })
      : i18n.translate('xpack.agentBuilder.agents.updateErrorMessage', {
          defaultMessage: 'Failed to update agent',
        });

    notifications.toasts.addDanger({
      title: errorMessageTitle,
      text: formatAgentBuilderErrorMessage(err),
    });
  };
  const {
    state: agentState,
    isLoading,
    isSubmitting,
    submit,
    tools,
    error,
  } = useAgentEdit({
    editingAgentId,
    onSaveSuccess,
    onSaveError,
  });

  const formMethods = useForm<AgentFormData>({
    defaultValues: { ...agentState },
    mode: 'onBlur',
    resolver: zodResolver(agentFormSchema),
  });
  const { control, handleSubmit, reset, formState, watch } = formMethods;
  const { errors, isDirty, isSubmitSuccessful } = formState;
  const hasErrors = Object.keys(errors).length > 0;

  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (agentState && !isLoading) {
      reset(agentState);
    }
  }, [agentState, isLoading, reset]);

  const handleCancel = useCallback(() => {
    setIsCancelling(true);
    defer(() => navigateToAgentBuilderUrl(appPaths.agents.list));
  }, [navigateToAgentBuilderUrl]);

  const handleSave = useCallback(
    async (
      data: AgentFormData,
      {
        navigateToListView = true,
        buttonId = BUTTON_IDS.SAVE,
      }: { navigateToListView?: boolean; buttonId?: string } = {}
    ) => {
      setSubmittingButtonId(buttonId);
      try {
        await submit(data);
      } finally {
        setSubmittingButtonId(undefined);
      }
      if (navigateToListView) {
        deferNavigateToAgentBuilderUrl(appPaths.agents.list);
      }
    },
    [submit, deferNavigateToAgentBuilderUrl]
  );

  const handleSaveAndChat = useCallback(
    async (data: AgentFormData) => {
      await handleSave(data, {
        buttonId: BUTTON_IDS.SAVE_AND_CHAT,
        navigateToListView: false,
      });
      deferNavigateToAgentBuilderUrl(appPaths.chat.newWithAgent({ agentId: data.id }));
    },
    [deferNavigateToAgentBuilderUrl, handleSave]
  );

  const isFormDisabled = isLoading || isSubmitting;
  const isSaveDisabled = isFormDisabled || hasErrors || (!isCreateMode && !isDirty);

  const [isContextMenuOpen, setContextMenuOpen] = useState(false);
  const [isAdditionalActionsMenuOpen, setAdditionalActionsMenuOpen] = useState(false);

  const [submittingButtonId, setSubmittingButtonId] = useState<string | undefined>();

  useUnsavedChangesPrompt({
    hasUnsavedChanges: isDirty && !isSubmitSuccessful && !isCancelling,
    history,
    http,
    navigateToUrl,
    openConfirm,
    shouldPromptOnReplace: false,
  });

  const agentTools = watch('configuration.tools');
  const activeToolsCount = useMemo(() => {
    return filterToolsBySelection(tools, agentTools).length;
  }, [tools, agentTools]);

  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: 'settings',
        name: i18n.translate('xpack.agentBuilder.agents.form.settingsTab', {
          defaultMessage: 'Settings',
        }),
        content: (
          <AgentSettingsTab
            control={control}
            formState={formState}
            isCreateMode={isCreateMode}
            isFormDisabled={isFormDisabled || !manageAgents}
          />
        ),
      },
      {
        id: 'tools',
        name: i18n.translate('xpack.agentBuilder.agents.form.toolsTab', {
          defaultMessage: 'Tools',
        }),
        content: (
          <ToolsTab
            control={control}
            tools={tools}
            isLoading={isLoading}
            isFormDisabled={isFormDisabled || !manageAgents}
          />
        ),
        append: (
          <EuiNotificationBadge
            color="subdued"
            css={css`
              block-size: 20px;
              min-inline-size: ${euiTheme.size.l};
              padding: 0 ${euiTheme.size.xs};
            `}
          >
            {activeToolsCount}
          </EuiNotificationBadge>
        ),
      },
    ],
    [
      control,
      formState,
      isCreateMode,
      isFormDisabled,
      tools,
      isLoading,
      euiTheme,
      activeToolsCount,
      manageAgents,
    ]
  );

  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const onTabClick = (tab: EuiTabbedContentTab) => {
    setSelectedTabId(tab.id);
  };

  const renderSaveButton = useCallback(
    ({ size = 's' }: Pick<EuiButtonProps, 'size'> = {}) => {
      const saveButton = (
        <EuiButton
          data-test-subj="agentFormSaveButton"
          form={agentFormId}
          size={size}
          type="submit"
          minWidth="112px"
          fill
          iconType="save"
          isLoading={submittingButtonId === BUTTON_IDS.SAVE}
          isDisabled={isSaveDisabled}
        >
          {i18n.translate('xpack.agentBuilder.agents.form.saveButton', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      );
      return hasErrors ? (
        <EuiToolTip
          display="block"
          content={i18n.translate('xpack.agentBuilder.agents.form.saveButtonTooltip', {
            defaultMessage: 'Resolve all form errors to save.',
          })}
        >
          {saveButton}
        </EuiToolTip>
      ) : (
        saveButton
      );
    },
    [agentFormId, submittingButtonId, isSaveDisabled, hasErrors]
  );

  const renderChatButton = useCallback(
    ({ size = 's' }: Pick<EuiButtonProps, 'size'> = {}) => {
      const commonProps: EuiButtonProps = {
        size,
        iconType: 'comment',
        isDisabled: isFormDisabled || hasErrors,
        minWidth: '112px',
      };
      return !isCreateMode ? (
        <EuiButton
          {...commonProps}
          onClick={() =>
            navigateToAgentBuilderUrl(appPaths.chat.newWithAgent({ agentId: editingAgentId }))
          }
        >
          {i18n.translate('xpack.agentBuilder.agents.form.chatButton', {
            defaultMessage: 'Chat',
          })}
        </EuiButton>
      ) : (
        <EuiButton
          {...commonProps}
          isLoading={submittingButtonId === BUTTON_IDS.SAVE_AND_CHAT}
          onClick={handleSubmit(handleSaveAndChat)}
        >
          {i18n.translate('xpack.agentBuilder.agents.form.saveAndChatButton', {
            defaultMessage: 'Save and chat',
          })}
        </EuiButton>
      );
    },
    [
      navigateToAgentBuilderUrl,
      isFormDisabled,
      hasErrors,
      editingAgentId,
      isCreateMode,
      handleSubmit,
      handleSaveAndChat,
      submittingButtonId,
    ]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '200px' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.agentBuilder.agents.errorTitle', {
          defaultMessage: 'Error loading agent',
        })}
        color="danger"
        iconType="error"
      >
        <p>
          {i18n.translate('xpack.agentBuilder.agents.errorMessage', {
            defaultMessage: 'Unable to load the agent. {errorMessage}',
            values: {
              errorMessage: (error as Error)?.message || String(error),
            },
          })}
        </p>
        <EuiSpacer size="m" />
        <EuiButton onClick={() => navigateToAgentBuilderUrl(appPaths.agents.list)}>
          {i18n.translate('xpack.agentBuilder.agents.backToListButton', {
            defaultMessage: 'Back to agents list',
          })}
        </EuiButton>
      </EuiCallOut>
    );
  }

  const agentName = watch('name');
  const agentDescription = watch('description');
  const agentAvatarSymbol = watch('avatar_symbol');
  const watchedAvatarColor = watch('avatar_color');
  const agentAvatarColor =
    watchedAvatarColor && isValidAgentAvatarColor(watchedAvatarColor)
      ? watchedAvatarColor
      : undefined;

  return (
    <KibanaPageTemplate panelled bottomBorder={false}>
      <KibanaPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="m">
            {!isCreateMode && (
              <EuiFlexItem grow={false}>
                <AgentAvatar
                  size="l"
                  name={agentName}
                  symbol={agentAvatarSymbol}
                  color={agentAvatarColor}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem data-test-subj="agentFormPageTitle">
              {isCreateMode ? labels.agents.newAgent : agentName}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        description={
          isCreateMode ? (
            <FormattedMessage
              id="xpack.agentBuilder.createAgent.description"
              defaultMessage="Create an AI agent with custom instructions, assign it tools to work with your data, and make it easily findable for your team. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={docLinksService.agentBuilderAgents}
                    target="_blank"
                    aria-label={i18n.translate(
                      'xpack.agentBuilder.agents.form.settings.systemReferencesLearnMoreAriaLabel',
                      {
                        defaultMessage: 'Learn more about agents in the documentation',
                      }
                    )}
                  >
                    {i18n.translate(
                      'xpack.agentBuilder.agents.form.settings.systemReferencesLearnMore',
                      {
                        defaultMessage: 'Learn more',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          ) : (
            agentDescription
          )
        }
        rightSideItems={[
          ...(!manageAgents
            ? []
            : !isCreateMode
            ? [
                <EuiFlexGroup gutterSize="xs">
                  {renderSaveButton({ size: 'm' })}
                  <EuiPopover
                    panelPaddingSize="xs"
                    isOpen={isAdditionalActionsMenuOpen}
                    closePopover={() => setAdditionalActionsMenuOpen(false)}
                    zIndex={Number(euiTheme.levels.header) - 1}
                    button={
                      <EuiButtonIcon
                        aria-label={i18n.translate('xpack.agentBuilder.agents.form.openMenuLabel', {
                          defaultMessage: 'Open menu',
                        })}
                        size="m"
                        isDisabled={isSaveDisabled}
                        display="fill"
                        iconType="arrowDown"
                        onClick={() => setAdditionalActionsMenuOpen((openState) => !openState)}
                      />
                    }
                  >
                    <EuiContextMenuPanel
                      size="s"
                      items={[
                        <EuiContextMenuItem
                          icon="comment"
                          size="s"
                          disabled={isSaveDisabled}
                          onClick={handleSubmit(handleSaveAndChat)}
                        >
                          {i18n.translate('xpack.agentBuilder.agents.form.saveAndChatButton', {
                            defaultMessage: 'Save and chat',
                          })}
                        </EuiContextMenuItem>,
                      ]}
                    />
                  </EuiPopover>
                </EuiFlexGroup>,
              ]
            : [renderSaveButton({ size: 'm' })]),
          renderChatButton({ size: 'm' }),
          ...(!manageAgents
            ? []
            : !isCreateMode
            ? [
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      size="m"
                      aria-label={i18n.translate('xpack.agentBuilder.agents.form.openMenuLabel', {
                        defaultMessage: 'Open menu',
                      })}
                      iconType="boxesVertical"
                      onClick={() => setContextMenuOpen(!isContextMenuOpen)}
                    />
                  }
                  isOpen={isContextMenuOpen}
                  closePopover={() => setContextMenuOpen(false)}
                  anchorPosition="downLeft"
                  panelPaddingSize="xs"
                  zIndex={Number(euiTheme.levels.header) - 1}
                >
                  <EuiContextMenuPanel
                    size="s"
                    items={[
                      <EuiContextMenuItem
                        icon="copy"
                        size="s"
                        onClick={() => {
                          setContextMenuOpen(false);
                          navigateToAgentBuilderUrl(appPaths.agents.new, {
                            [searchParamNames.sourceId]: editingAgentId,
                          });
                        }}
                      >
                        {i18n.translate('xpack.agentBuilder.agents.form.cloneButton', {
                          defaultMessage: 'Clone',
                        })}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        icon="trash"
                        size="s"
                        css={css`
                          color: ${euiTheme.colors.textDanger};
                        `}
                        onClick={() => {
                          setContextMenuOpen(false);
                          onDelete?.();
                        }}
                      >
                        {i18n.translate('xpack.agentBuilder.agents.form.deleteButton', {
                          defaultMessage: 'Delete',
                        })}
                      </EuiContextMenuItem>,
                    ]}
                  />
                </EuiPopover>,
              ]
            : []),
        ]}
        rightSideGroupProps={{ gutterSize: 's' }}
      />
      <KibanaPageTemplate.Section>
        <FormProvider {...formMethods}>
          <EuiForm
            id={agentFormId}
            component="form"
            onSubmit={handleSubmit(
              (data) => handleSave(data),
              () => {
                // Switch to first tab (settings) when validation fails
                setSelectedTabId('settings');
              }
            )}
            fullWidth
          >
            <EuiTabbedContent
              tabs={tabs}
              selectedTab={tabs.find((tab) => tab.id === selectedTabId)}
              onTabClick={onTabClick}
            />
          </EuiForm>
        </FormProvider>
        <EuiSpacer
          css={css`
            height: ${!isMobile ? euiTheme.size.xxxxl : '144px'};
          `}
        />
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.BottomBar
        paddingSize="m"
        restrictWidth={false}
        position="fixed"
        usePortal
      >
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" css={pushFlyoutPaddingStyles}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={labels.agents.settings.cancelButtonLabel}
              size="s"
              iconType="cross"
              color="text"
              onClick={handleCancel}
            >
              {labels.agents.settings.cancelButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{renderChatButton()}</EuiFlexItem>
          {manageAgents && <EuiFlexItem grow={false}>{renderSaveButton()}</EuiFlexItem>}
        </EuiFlexGroup>
      </KibanaPageTemplate.BottomBar>
    </KibanaPageTemplate>
  );
};
