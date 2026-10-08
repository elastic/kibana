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
  AssigneeAvatarStack,
  EscalationMetaInfo,
  LinkedInvestigationsBadge,
  type EscalationQueueItem,
  type EscalationStatus,
} from './src/components/escalation_queue';

export { ActionButton } from './src/components/actions/action_button';
export { getCopyLinkFlyoutAction } from './src/components/actions/copy_link_action';
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
  type CloseInvestigationModalRenderProps,
} from './src/components/details/flyout_footer';
export {
  ConversationHeaderBlocks,
  type ConversationHeaderBlocksProps,
} from './src/components/details/header_blocks';
export {
  OverviewTab,
  type OverviewTabProps,
  type OverviewSections,
} from './src/components/details/details_flyout_tab_contents';
export {
  EscalationFlyoutHeader,
  type EscalationFlyoutHeaderProps,
} from './src/components/details/escalation_flyout_header';
export { StatusToggle, type StatusToggleProps } from './src/components/details/status_toggle';
export { DetailsBlock } from './src/components/details/detail_block';
export {
  ProposedActionButton,
  type ProposedActionButtonProps,
} from './src/components/details/proposed_action_button';

export {
  FlyoutGroupedAttachments,
  createFlyoutGroupedAttachmentsRegistry,
  GroupedAttachmentRow,
  GroupedAttachmentsSection,
  type FlyoutGroupedAttachmentDefinition,
  type FlyoutGroupedAttachmentRendererProps,
  type FlyoutGroupedAttachmentsRegistry,
  type GroupedAttachmentRowAction,
  type GroupedAttachmentRowProps,
  type GroupedAttachmentsSectionProps,
  type RegisterFlyoutGroupedAttachment,
} from './src/components/grouped_attachments';

export {
  registerAgenticInvestigationTemplateUI,
  type RegisterAgenticInvestigationTemplateUIOptions,
  registerEscalationTemplateUI,
  type RegisterEscalationTemplateUIOptions,
  getInvestigationTabIds,
  getEscalationTabIds,
} from './src/template_ui/register';
export {
  type RenderAssignees,
  type AssigneesSlotRenderProps,
  type RenderStatus,
  type StatusSlotRenderProps,
  type RenderLinkedInvestigations,
  type LinkedInvestigationsSlotRenderProps,
  type RenderOverview,
  type OverviewSlotRenderProps,
  type RenderLiveState,
  type LiveStateSlotRenderProps,
  type RenderTitle,
  type TitleSlotRenderProps,
} from './src/template_ui/types';
export {
  LinkedInvestigationsList,
  type LinkedInvestigationItem,
  type LinkedInvestigationsListProps,
} from './src/components/details/linked_investigations_list';
export { conversationToInvestigation } from './src/template_ui/conversation_to_investigation';

export { getEmptyValue, getActionButtonIconProps, isDecided } from './src/components/helpers';

export type { Investigation, RecommendedAction, TimelineEvent } from './src/types/investigation';
export {
  CONVERSATION_QUEUE_LABELS,
  CONVERSATION_QUEUE_CATEGORIES,
  CONVERSATION_CATEGORY_COLORS,
} from './src/types/queue';

export {
  clearImpactDetailsRenderer,
  registerImpactDetailsRenderer,
  renderImpactDetails,
} from './src/components/impact/impact_details_renderer';
export {
  clearImpactEntityOpener,
  entityStoreIdType,
  hasImpactEntityOpener,
  openImpactEntity,
  registerImpactEntityOpener,
  type ImpactEntityTarget,
} from './src/components/impact/open_impact_entity';
export {
  Impact,
  impactPills,
  investigationEntityIds,
  matchesEntityFilter,
  useEntityFilter,
  type ImpactFilterable,
  type ImpactPill,
} from './src/components/filters/impact';

export { BaseActionModal } from './src/components/modals/base_action_modal';
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
