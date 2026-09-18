/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ActionButton } from './src/components/actions/action_button';
export {
  BaseActions,
  type BaseActionsProps,
  type CardActionType,
} from './src/components/actions/base_actions';

export { ConversationCard } from './src/components/conversation_card/conversation_card';
export { ConversationMetaInfo } from './src/components/conversation_card/conversation_meta_info';
export { TemplateBadge } from './src/components/conversation_card/template_badge';
export { type ConversationsActionsGroupProps } from './src/components/conversation_card/actions_group';

export { ConversationQueue } from './src/components/conversation_queue/conversation_queue';

export {
  ConversationDetailsFlyoutHeader,
  type ConversationDetailsFlyoutHeaderProps,
} from './src/components/details/flyout_header';
export {
  ConversationDetailsFlyoutFooter,
  type ConversationDetailsFlyoutFooterProps,
} from './src/components/details/flyout_footer';
export {
  InvestigationDetailsFlyout,
  type InvestigationDetailsFlyoutProps,
  INVESTIGATION_FLYOUT_TABS,
  type InvestigationFlyoutTab,
} from './src/components/details/investigation_details_flyout';
export {
  InvestigationHeaderBlocks,
  type InvestigationHeaderBlocksProps,
} from './src/components/details/header_blocks';
export {
  AttachmentsTab,
  type AttachmentsTabProps,
  OverviewTab,
  TimelineTab,
} from './src/components/details/details_flyout_tab_contents';
export { DetailsBlock } from './src/components/details/detail_block';

export { TimelineEventList } from './src/components/timeline/timeline_event_list';

export {
  registerAgenticInvestigationTemplateUI,
  type RegisterAgenticInvestigationTemplateUIOptions,
  getInvestigationTabIds,
} from './src/template_ui/register';
export type { InvestigationLoader } from './src/template_ui/investigation_slot';

export { getEmptyValue, getActionButtonIconProps, isDecided } from './src/components/helpers';

export type { Investigation, RecommendedAction, TimelineEvent } from './src/types/investigation';
export {
  CONVERSATION_QUEUE_LABELS,
  CONVERSATION_QUEUE_CATEGORIES,
  CONVERSATION_CATEGORY_COLORS,
} from './src/types/queue';

export { Impact, investigationEntityIds } from './src/components/filters/impact';

export { BaseActionModal } from './src/components/modals/base_action_modal';
export { AssignActionModal } from './src/components/modals/assign_action_modal';
export { MODAL_TRANSLATIONS } from './src/components/modals/translations';
export {
  InvestigationActionModals,
  type InvestigationActionModalsProps,
} from './src/components/modals/investigation_action_modals';
export {
  ApprovalModal,
  type ApprovalModalProps,
} from './src/components/modals/approval_modal/approval_modal';
export {
  ApprovalContent,
  type ApprovalContentProps,
  type ApprovalAction,
  type AlwaysAllowOption,
} from './src/components/modals/approval_modal/approval_content';
export { type ActionImpactItemProps } from './src/components/modals/approval_modal/action_impact_item';
export {
  ActionImpactSection,
  type ActionImpactContent,
  type ActionImpactSectionProps,
} from './src/components/modals/approval_modal/action_impact_section';
