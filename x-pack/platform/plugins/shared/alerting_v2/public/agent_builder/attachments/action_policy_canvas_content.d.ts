import React from 'react';
import { type AttachmentRenderProps, type CanvasRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type { ActionPolicyAttachment } from './action_policy_attachment_definition';
export interface ActionPolicyCanvasContentProps extends AttachmentRenderProps<ActionPolicyAttachment>, CanvasRenderCallbacks {
}
export declare const ActionPolicyCanvasContent: ({ attachment, registerActionButtons, updateOrigin, }: ActionPolicyCanvasContentProps) => React.JSX.Element;
