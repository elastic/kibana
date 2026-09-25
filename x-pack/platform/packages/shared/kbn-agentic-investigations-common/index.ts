/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  EscalationQueue,
  EscalationCard,
  AssignToUsers,
  EscalationMetaInfo,
  LinkedInvestigationsBadge,
  type EscalationQueueItem,
  type EscalationStatus,
} from './src/components/escalation_queue';

export { ActionButton } from './src/components/actions/action_button';
export {
  BaseActions,
  type BaseActionsProps,
  type CardActionType,
} from './src/components/actions/base_actions';

export { ConversationCard } from './src/components/conversation_card/conversation_card';
export { ConversationCardCompact } from './src/components/conversation_card/conversation_card_compact';
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
  ConversationHeaderBlocks,
  type ConversationHeaderBlocksProps,
  InvestigationHeaderBlocks,
  type InvestigationHeaderBlocksProps,
} from './src/components/details/header_blocks';
export {
  EscalationFlyoutHeader,
  type EscalationFlyoutHeaderProps,
} from './src/components/details/escalation_flyout_header';
export { OverviewTab } from './src/components/details/details_flyout_tab_contents';
export { DetailsBlock } from './src/components/details/detail_block';

export {
  AttachmentSummarySection,
  type AttachmentSummarySectionProps,
  AttachmentSummaryList,
  type AttachmentSummaryListProps,
  AttachmentSummaryGroup,
  type AttachmentSummaryGroupProps,
  DEFAULT_COLLAPSED_COUNT,
  AttachmentSummaryRow,
  type AttachmentSummaryRowProps,
  selectSummaryAttachments,
  SUMMARY_ATTACHMENT_TYPES,
  type SummaryAttachmentType,
} from './src/components/attachment_summary';

export {
  registerAgenticInvestigationTemplateUI,
  type RegisterAgenticInvestigationTemplateUIOptions,
  registerEscalationTemplateUI,
  type RegisterEscalationTemplateUIOptions,
  getInvestigationTabIds,
} from './src/template_ui/register';
export { type RenderAssignees, type AssigneesSlotRenderProps } from './src/template_ui/types';
export { conversationToInvestigation } from './src/template_ui/conversation_to_investigation';

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
  type EscalationModalMode,
  type EscalationIncidentSummary,
} from './src/components/modals/escalation_modal';
export { type EscalationModalRenderProps } from './src/components/modals/investigation_action_modals';

// The approval primitives live in `@kbn/proposals-ui`. This package consumes
// `ApprovalModal` for the investigation flyout's action modals, but does not
// re-export it: a consumer that wants the approval UI on its own should depend
// on the proposals package directly rather than reach it through here.
