import React from 'react';
import { type AttachmentRenderProps, type CanvasRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type { RuleAttachment } from './rule_attachment_definition';
export interface RuleCanvasContentProps extends AttachmentRenderProps<RuleAttachment>, CanvasRenderCallbacks {
}
export declare const RuleCanvasContent: ({ attachment, registerActionButtons, updateOrigin, }: RuleCanvasContentProps) => React.JSX.Element;
