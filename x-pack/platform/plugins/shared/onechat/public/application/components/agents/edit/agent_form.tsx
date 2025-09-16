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
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { filterToolsBySelection, type AgentDefinition } from '@kbn/onechat-common';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { css } from '@emotion/react';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { defer } from 'lodash';
import { useAgentEdit } from '../../../hooks/agents/use_agent_edit';
import { useKibana } from '../../../hooks/use_kibana';
import { useNavigation } from '../../../hooks/use_navigation';
import { searchParamNames } from '../../../search_param_names';
import { appPaths } from '../../../utils/app_paths';
import { isValidAgentAvatarColor } from '../../../utils/color';
import { labels } from '../../../utils/i18n';
import { zodResolver } from '../../../utils/zod_resolver';
import { AgentAvatar } from '../agent_avatar';
import { agentFormSchema } from './agent_form_validation';
import { AgentSettingsTab } from './tabs/settings_tab';
import { ToolsTab } from './tabs/tools_tab';

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

export type AgentFormData = Omit<AgentDefinition, 'type'>;

export const AgentForm: React.FC<AgentFormProps> = ({ editingAgentId, onDelete }) => {
  const { euiTheme } = useEuiTheme();
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { navigateToOnechatUrl } = useNavigation();
  // Resolve state updates before navigation to avoid triggering unsaved changes prompt
  const deferNavigateToOnechatUrl = useCallback(
    (...args: Parameters<typeof navigateToOnechatUrl>) => {
      defer(() => navigateToOnechatUrl(...args));
    },
    [navigateToOnechatUrl]
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
        ? i18n.translate('xpack.onechat.agents.createSuccessMessage', {
            defaultMessage: 'Agent created successfully',
          })
        : i18n.translate('xpack.onechat.agents.updateSuccessMessage', {
            defaultMessage: 'Agent updated successfully',
          })
    );
  };

  const onSaveError = (err: Error) => {
    const errorMessageTitle = isCreateMode
      ? i18n.translate('xpack.onechat.agents.createErrorMessage', {
          defaultMessage: 'Failed to create agent',
        })
      : i18n.translate('xpack.onechat.agents.updateErrorMessage', {
          defaultMessage: 'Failed to update agent',
        });

    notifications.toasts.addDanger({
      title: errorMessageTitle,
      text: formatOnechatErrorMessage(err),
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
    defer(() => navigateToOnechatUrl(appPaths.agents.list));
  }, [navigateToOnechatUrl]);

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
        deferNavigateToOnechatUrl(appPaths.agents.list);
      }
    },
    [submit, deferNavigateToOnechatUrl]
  );

  const handleSaveAndChat = useCallback(
    async (data: AgentFormData) => {
      await handleSave(data, {
        buttonId: BUTTON_IDS.SAVE_AND_CHAT,
        navigateToListView: false,
      });
      deferNavigateToOnechatUrl(appPaths.chat.newWithAgent({ agentId: data.id }));
    },
    [deferNavigateToOnechatUrl, handleSave]
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
  });

  const agentTools = watch('configuration.tools');
  const activeToolsCount = useMemo(() => {
    return filterToolsBySelection(tools, agentTools).length;
  }, [tools, agentTools]);

  const tabs = useMemo<EuiTabbedContentTab[]>(
    () => [
      {
        id: 'settings',
        name: i18n.translate('xpack.onechat.agents.form.settingsTab', {
          defaultMessage: 'Settings',
        }),
        content: (
          <AgentSettingsTab
            control={control}
            formState={formState}
            isCreateMode={isCreateMode}
            isFormDisabled={isFormDisabled}
          />
        ),
      },
      {
        id: 'tools',
        name: i18n.translate('xpack.onechat.agents.form.toolsTab', {
          defaultMessage: 'Tools',
        }),
        content: (
          <ToolsTab
            control={control}
            tools={tools}
            isLoading={isLoading}
            isFormDisabled={isFormDisabled}
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
    [control, formState, isCreateMode, isFormDisabled, tools, isLoading, euiTheme, activeToolsCount]
  );

  const renderSaveButton = useCallback(
    ({ size = 's' }: Pick<EuiButtonProps, 'size'> = {}) => {
      const saveButton = (
        <EuiButton
          form={agentFormId}
          size={size}
          type="submit"
          minWidth="112px"
          fill
          iconType="save"
          isLoading={submittingButtonId === BUTTON_IDS.SAVE}
          isDisabled={isSaveDisabled}
        >
          {i18n.translate('xpack.onechat.agents.form.saveButton', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      );
      return hasErrors ? (
        <EuiToolTip
          display="block"
          content={i18n.translate('xpack.onechat.agents.form.saveButtonTooltip', {
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
            navigateToOnechatUrl(appPaths.chat.newWithAgent({ agentId: editingAgentId }))
          }
        >
          {i18n.translate('xpack.onechat.agents.form.chatButton', {
            defaultMessage: 'Chat',
          })}
        </EuiButton>
      ) : (
        <EuiButton
          {...commonProps}
          isLoading={submittingButtonId === BUTTON_IDS.SAVE_AND_CHAT}
          onClick={handleSubmit(handleSaveAndChat)}
        >
          {i18n.translate('xpack.onechat.agents.form.saveAndChatButton', {
            defaultMessage: 'Save and chat',
          })}
        </EuiButton>
      );
    },
    [
      navigateToOnechatUrl,
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
        title={i18n.translate('xpack.onechat.agents.errorTitle', {
          defaultMessage: 'Error loading agent',
        })}
        color="danger"
        iconType="error"
      >
        <p>
          {i18n.translate('xpack.onechat.agents.errorMessage', {
            defaultMessage: 'Unable to load the agent. {errorMessage}',
            values: {
              errorMessage: (error as Error)?.message || String(error),
            },
          })}
        </p>
        <EuiSpacer size="m" />
        <EuiButton onClick={() => navigateToOnechatUrl(appPaths.agents.list)}>
          {i18n.translate('xpack.onechat.agents.backToListButton', {
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
                  size="xl"
                  agent={{
                    name: agentName,
                    avatar_symbol: agentAvatarSymbol,
                    avatar_color: agentAvatarColor,
                  }}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem>{isCreateMode ? labels.agents.newAgent : agentName}</EuiFlexItem>
          </EuiFlexGroup>
        }
        description={
          isCreateMode
            ? i18n.translate('xpack.onechat.createAgent.description', {
                defaultMessage: 'Create an AI agent, select tools and provide custom instructions.',
              })
            : agentDescription
        }
        rightSideItems={[
          ...(!isCreateMode
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
                        aria-label={i18n.translate('xpack.onechat.agents.form.openMenuLabel', {
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
                          {i18n.translate('xpack.onechat.agents.form.saveAndChatButton', {
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
          ...(!isCreateMode
            ? [
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      size="m"
                      aria-label={i18n.translate('xpack.onechat.agents.form.openMenuLabel', {
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
                          navigateToOnechatUrl(appPaths.agents.new, {
                            [searchParamNames.sourceId]: editingAgentId,
                          });
                        }}
                      >
                        {i18n.translate('xpack.onechat.agents.form.cloneButton', {
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
                        {i18n.translate('xpack.onechat.agents.form.deleteButton', {
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
            onSubmit={handleSubmit((data) => handleSave(data))}
            fullWidth
          >
            <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
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
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" iconType="cross" color="text" onClick={handleCancel}>
              {i18n.translate('xpack.onechat.agents.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{renderChatButton()}</EuiFlexItem>
          <EuiFlexItem grow={false}>{renderSaveButton()}</EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.BottomBar>
    </KibanaPageTemplate>
  );
};
